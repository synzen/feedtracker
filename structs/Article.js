const moment = require('moment-timezone')
const htmlConvert = require('html-to-text')
const globalConfig = require('../util/configs.js')
const BASE_REGEX_PHS = ['title', 'author', 'summary', 'description', 'guid', 'date']

class Article {
  constructor (raw, feedConfig = {}) {
    this.feedConfig = feedConfig
    this.raw = raw
    this.reddit = raw.meta.link && raw.meta.link.includes('www.reddit.com')
    this.youtube = !!(raw.guid && raw.guid.startsWith('yt:video') && raw['media:group'] && raw['media:group']['media:description'] && raw['media:group']['media:description']['#'])
    this.enabledRegex = typeof this.feedConfig.regexOps === 'object'
    this.placeholdersForRegex = this.enabledRegex ? BASE_REGEX_PHS.slice() : []
    this.meta = raw.meta
    this.guid = raw.guid
    this.author = raw.author ? this.constructor._cleanup(this.feedConfig, raw.author) : ''
    this.link = raw.link ? raw.link.split(' ')[0].trim() : '' // Sometimes HTML is appended at the end of links for some reason
    if (this.reddit && this.link.startsWith('/r/')) this.link = 'https://www.reddit.com' + this.link

    // Title
    this.titleImages = []
    this.titleAnchors = []
    this.title = this.constructor._cleanup(this.feedConfig, raw.title, this.titleImages, this.titleAnchors)
    for (let titleImgNum = 0; titleImgNum < this.titleImages.length; ++titleImgNum) {
      const term = `title:image${titleImgNum + 1}`
      this[term] = this.titleImages[titleImgNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }
    for (let titleAnchorNum = 0; titleAnchorNum < this.titleAnchors.length; ++titleAnchorNum) {
      const term = `title:anchor${titleAnchorNum + 1}`
      this[term] = this.titleAnchors[titleAnchorNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }

    // guid - Raw exposure, no cleanup. Not meant for use by most feeds.
    this.guid = raw.guid ? raw.guid : ''

    // Date
    if (!(raw.pubdate instanceof Date)) raw.pubdate = new Date(raw.pubdate)
    if (raw.pubdate && raw.pubdate.toString() !== 'Invalid Date') {
      const feedTimezone = this.feedConfig.timezone
      const timezone = feedTimezone && moment.tz.zone(feedTimezone) ? feedTimezone : globalConfig.timezone
      const dateFormat = this.feedConfig.dateFormat ? this.feedConfig.dateFormat : globalConfig.dateFormat

      const useDateFallback = globalConfig.dateFallback === true && (!raw.pubdate || raw.pubdate.toString() === 'Invalid Date')
      this.useTimeFallback = globalConfig.timeFallback === true && raw.pubdate.toString() !== 'Invalid Date'
      const toCheck = [raw.pubdate.getUTCHours(), raw.pubdate.getMinutes(), raw.pubdate.getSeconds(), raw.pubdate.getMilliseconds()]
      toCheck.forEach(part => {
        if (part !== 0) this.useTimeFallback = false // If any of the above is equal to 0, use the fallback
      })

      const date = useDateFallback ? new Date() : raw.pubdate
      const localMoment = moment(date)
      if (this.feedConfig.dateLanguage) localMoment.locale(this.feedConfig.dateLanguage)
      const now = new Date()
      const vanityDate = this.useTimeFallback ? localMoment.hours(now.getHours()).minutes(now.getMinutes()).seconds(now.getSeconds()).millisecond(now.getMilliseconds()).tz(timezone).format(dateFormat) : localMoment.tz(timezone).format(dateFormat)
      this.date = (vanityDate !== 'Invalid Date') ? vanityDate : ''
      this.rawDate = raw.pubdate
    }

    // Description and reddit-specific placeholders
    this.descriptionImages = []
    this.descriptionAnchors = []
    this.description = this.youtube ? raw['media:group']['media:description']['#'] : this.constructor._cleanup(this.feedConfig, raw.description, this.descriptionImages, this.descriptionAnchors) // Account for youtube's description
    for (let desImgNum = 0; desImgNum < this.descriptionImages.length; ++desImgNum) {
      const term = `description:image${desImgNum + 1}`
      this[term] = this.descriptionImages[desImgNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }
    for (let desAnchorNum = 0; desAnchorNum < this.descriptionAnchors.length; ++desAnchorNum) {
      const term = `description:anchor${desAnchorNum + 1}`
      this[term] = this.descriptionAnchors[desAnchorNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }

    // Summary
    this.summaryImages = []
    this.summaryAnchors = []
    this.summary = this.constructor._cleanup(this.feedConfig, raw.summary, this.summaryImages, this.summaryAnchors)
    for (let sumImgNum = 0; sumImgNum < this.summaryImages.length; ++sumImgNum) {
      const term = `summary:image${sumImgNum + 1}`
      this[term] = this.summaryImages[sumImgNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }
    for (let sumAnchorNum = 0; sumAnchorNum < this.summaryAnchors.length; ++sumAnchorNum) {
      const term = `summary:anchor${sumAnchorNum + 1}`
      this[term] = this.summaryAnchors[sumAnchorNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }

    // Image links
    const imageLinks = []
    this.constructor._findImages(raw, imageLinks)
    this.images = (imageLinks.length === 0) ? undefined : imageLinks
    for (let imageNum = 0; imageNum < imageLinks.length; ++imageNum) {
      const term = `image:${imageNum + 1}`
      this[term] = imageLinks[imageNum]
      if (this.enabledRegex) this.placeholdersForRegex.push(term)
    }

    // Categories/Tags
    if (raw.categories) {
      let categoryList = ''
      const cats = raw.categories
      for (let catNum = 0; catNum < cats.length; ++catNum) {
        if (typeof cats[catNum] !== 'string') continue
        categoryList += cats[catNum].trim()
        if (catNum !== cats.length - 1) categoryList += '\n'
      }
      this.tags = categoryList
    }

    // Regex-defined custom placeholders
    if (this.enabledRegex) {
      this.regexPlaceholders = {} // Each key is a validRegexPlaceholder, and their values are an object of named placeholders with the modified content
      for (let placeholderName in this.placeholdersForRegex) {
        const regexResults = this.constructor._evalRegexConfig(this.feedConfig, this[placeholderName], placeholderName)
        this.regexPlaceholders[placeholderName] = regexResults
      }
    }
  }

  static get BASE_REGEX_PHS () {
    return BASE_REGEX_PHS
  }

  static _escapeRegExp (str) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
  }

  // To avoid stack call exceeded
  static _checkType (item, results) {
    if (Object.prototype.toString.call(item) === '[object Object]') {
      return () => Article._findImages(item, results)
    } else if (typeof item === 'string' && item.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) && !results.includes(item) && results.length < 9) {
      if (item.startsWith('//')) item = 'http:' + item
      results.push(item)
    }
  }

  // Used to find images in any object values of the article
  static _findImages (obj, results) {
    for (let key in obj) {
      let value = Article._checkType(obj[key], results)
      while (typeof value === 'function') {
        value = value()
      }
    }
  }

  static _cleanup (feedConfig, text, imgSrcs, anchorLinks) {
    if (!text) return ''

    text = htmlConvert.fromString(text, {
      tables: (feedConfig.formatTables !== undefined && typeof feedConfig.formatTables === 'boolean' ? feedConfig.formatTables : globalConfig.formatTables) === true ? true : [],
      wordwrap: null,
      ignoreHref: true,
      noLinkBrackets: true,
      format: {
        image: node => {
          const isStr = typeof node.attribs.src === 'string'
          let link = isStr ? node.attribs.src.trim() : node.attribs.src
          if (isStr && link.startsWith('//')) link = 'http:' + link
          else if (isStr && !link.startsWith('http://') && !link.startsWith('https://')) link = 'http://' + link

          if (Array.isArray(imgSrcs) && imgSrcs.length < 9 && isStr && link) imgSrcs.push(link)

          let exist = true
          const globalExistOption = globalConfig.imageLinksExistence
          exist = globalExistOption
          const specificExistOption = feedConfig.imageLinksExistence
          exist = typeof specificExistOption !== 'boolean' ? exist : specificExistOption
          if (!exist) return ''

          return link
        },
        anchor: (node, fn, options) => {
          const orig = fn(node.children, options)
          if (!Array.isArray(anchorLinks)) return orig
          const href = node.attribs.href ? node.attribs.href.trim() : ''
          if (anchorLinks.length < 5 && href) anchorLinks.push(href)
          return orig
        }
      }
    })

    text = text.replace(/\n\s*\n\s*\n/g, '\n\n') // Replace triple line breaks with double
    const arr = text.split('\n')
    for (let q = 0; q < arr.length; ++q) arr[q] = arr[q].replace(/\s+$/, '') // Remove trailing spaces
    return arr.join('\n')
  }

  static _evalRegexConfig (feedConfig, text, placeholderName) {
    const customPlaceholders = {}

    if (Array.isArray(feedConfig.regexOps[placeholderName])) { // Eval regex if specified
      if (Array.isArray(feedConfig.regexOps.disabled) && feedConfig.regexOps.disabled.length > 0) { // .disabled can be an array of disabled placeholders, or just a boolean to disable everything
        for (let n of feedConfig.regexOps.disabled) { // Looping through strings of placeholders
          if (n === placeholderName) return null // text
        }
      }

      const phRegexOps = feedConfig.regexOps[placeholderName]
      for (const regexOp of phRegexOps) { // Looping through each regexOp for a placeholder
        if (regexOp.disabled === true || typeof regexOp.name !== 'string') continue

        if (!customPlaceholders[regexOp.name]) customPlaceholders[regexOp.name] = text // Initialize with a value if it doesn't exist

        const clone = Object.assign({}, customPlaceholders)
        customPlaceholders[regexOp.name] = Article._regexReplace(clone[regexOp.name], regexOp.search, regexOp.replacement) // newText = modified
      }
    } else return null
    return customPlaceholders
  }

  static _regexReplace (string, searchOptions, replacement) {
    if (searchOptions !== null && typeof searchOptions !== 'object') throw new TypeError(`Expected RegexOp search key to have an object value, found ${typeof searchOptions} instead`)
    const flags = !searchOptions.flags ? 'g' : searchOptions.flags.includes('g') ? searchOptions.flags : searchOptions.flags + 'g' // Global flag must be included to prevent infinite loop during .exec
    const matchIndex = searchOptions.match !== undefined ? parseInt(searchOptions.match, 10) : undefined
    const groupNum = searchOptions.group !== undefined ? parseInt(searchOptions.group, 10) : undefined
    const regExp = new RegExp(searchOptions.regex, flags)
    const matches = []
    let match
    do { // Find everything that matches the search regex query and push it to matches.
      match = regExp.exec(string)
      if (match) matches.push(match)
    } while (match)
    if (matches.length === 0) return string
    else {
      const mi = matches[matchIndex || 0]
      if (!mi) return string
      else match = mi[groupNum || 0]
    }

    if (replacement !== undefined) {
      if (matchIndex === undefined && groupNum === undefined) { // If no match or group is defined, replace every full match of the search in the original string
        for (let item of matches) {
          const exp = new RegExp(Article._escapeRegExp(item[0]), flags)
          string = string.replace(exp, replacement)
        }
      } else if (matchIndex && groupNum === undefined) { // If no group number is defined, use the full match of this particular match number in the original string
        const exp = new RegExp(Article._escapeRegExp(matches[matchIndex][0]), flags)
        string = string.replace(exp, replacement)
      } else if (matchIndex === undefined && groupNum) {
        const exp = new RegExp(Article._escapeRegExp(matches[0][groupNum]), flags)
        string = string.replace(exp, replacement)
      } else {
        const exp = new RegExp(Article._escapeRegExp(matches[matchIndex][groupNum]), flags)
        string = string.replace(exp, replacement)
      }
    } else string = match

    return string
  }
}

module.exports = Article
