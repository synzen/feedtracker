const moment = require('moment-timezone')
const EXCLUDED_CUSTOM_COMPARISONS = ['title', 'guid', 'pubdate', 'pubDate', undefined]

module.exports = (data, callback) => {
  const { articleList, feedJSON } = data
  const totalArticles = articleList.length
  const dbIds = []
  const dbTitles = []
  const customComparisons = feedJSON.customComparisons // Array of names
  const customComparisonsValues = {}
  const feedJSONId = feedJSON.id
  const seenArticleList = feedJSON.seenArticleList.slice(0) // Clone it

  const checkCustomComparisons = customComparisons && customComparisons.length > 0
  for (const seenArticle of seenArticleList) {
    // Push the main data for built in comparisons
    dbIds.push(seenArticle._id)
    dbTitles.push(seenArticle.title)

    // Now look at custom comparisons
    if (checkCustomComparisons) {
      // Iterate over the values stored in the db, and see if the custom comparison names exist in any of the articles. If they do, push them
      for (const compName of customComparisons) {
        if (!EXCLUDED_CUSTOM_COMPARISONS.includes(compName) && (typeof seenArticle[compName] !== 'object' || seenArticle[compName] === null)) {
          if (!customComparisonsValues[compName]) customComparisonsValues[compName] = []
          customComparisonsValues[compName].push(seenArticle[compName])
        }
      }
    }
  }

  for (const article of articleList) {
    // Check if there are any new ids that must be inserted
    if (!dbIds.includes(article._id)) seenArticleList.push(article)
  }

  let processedArticles = 0

  const cutoffDay = moment().subtract(1, 'days')

  const globalDateCheck = true
  const localDateCheck = feedJSON.checkDates
  const checkDate = typeof localDateCheck !== 'boolean' ? globalDateCheck : localDateCheck

  const globalTitleCheck = false
  const localTitleCheck = feedJSON.checkTitles
  const checkTitle = typeof globalTitleCheck !== 'boolean' ? globalTitleCheck : localTitleCheck

  for (let a = articleList.length - 1; a >= 0; --a) { // Loop from oldest to newest so the queue that sends articleMessages work properly, sending the older ones first
    const article = articleList[a]
    if (dbIds.length === 0 && articleList.length > 1) { // Only skip if the articleList length is !== 1, otherwise a feed with only 1 article to send since it may have been the first item added
      seenArticle(true, article)
    } else if (dbIds.includes(article._id)) {
      seenArticle(true, article)
    } else if (checkTitle && dbTitles.includes(article.title)) {
      seenArticle(true, article)
    } else if (checkDate && article.pubdate && article.pubdate.toString() !== 'Invalid Date' && feedJSON.checkDates === true && article.pubdate < cutoffDay) { // undated articles still get sent
      seenArticle(true, article)
    } else {
      seenArticle(false, article)
    }
  }

  function seenArticle (seen, article) {
    // Check for extra user-specified comparisons
    if (seen) {
      if (!checkCustomComparisons) return ++processedArticles === totalArticles ? finishFeed() : null // Stops here if it already exists in table, AKA "seen"
      for (const comparisonName of customComparisons) {
        const reference = customComparisonsValues[comparisonName]
        const articleCustomComparisonValue = article[comparisonName]
        if (!reference || reference.includes(articleCustomComparisonValue)) {
          continue // It is seen
        }

        return seenArticle(false, article)
      }
      return ++processedArticles === totalArticles ? finishFeed() : null
    }

    callback(null, { status: 'article', article: article, link: feedJSON.link })
    return ++processedArticles === totalArticles ? finishFeed() : null
  }

  function finishFeed () {
    callback(null, { status: 'success', link: feedJSON.link, seenArticleList: seenArticleList, feedJSONId: feedJSONId })
  }
}
