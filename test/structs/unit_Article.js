/* eslint-env mocha */

const fs = require('fs')
const sinon = require('sinon')
const expect = require('chai').expect
const Article = require('../../structs/Article.js')

describe('Unit::Article', function () {
  let regexOps, rawArticleWithImages, articleWithImages
  before(function () {
    regexOps = JSON.parse(fs.readFileSync('./test/files/regexOps.json'))
    rawArticleWithImages = JSON.parse(fs.readFileSync('./test/files/articleWithImages.json'))
    rawArticleWithImages.pubdate = new Date(rawArticleWithImages.pubdate)
    articleWithImages = new Article(rawArticleWithImages)
  })
  it('should have this.reddit = true if the raw meta link includes www.reddit.com', function () {
    expect(new Article({ meta: { link: 'www.reddit.com' } }).reddit).to.equal(true)
  })
  it('should fix reddit links only starting with /r/ by prepending it with https://www.reddit.com', function () {
    expect(new Article({ meta: { link: 'www.reddit.com' }, link: '/r/subreddit' }).link).to.equal('https://www.reddit.com/r/subreddit')
  })
  it('should have this.youtube = true if the raw article has the right properties', function () {
    const raw = {
      meta: {},
      guid: 'yt:video',
      'media:group': {
        'media:description': {
          '#': 'a youtube description'
        }
      }
    }
    expect(new Article(raw).youtube).to.equal(true)
  })
  it('should have this.enabledRegex to false by default', function () {
    expect(new Article({ meta: { link: 'www.reddit.com' } }).enabledRegex).to.equal(false)
  })
  it('should set this.enabledRegex to true if the regexOps object is defined in feedConfig', function () {
    expect(new Article({ meta: { link: 'www.reddit.com' } }, { regexOps: {} }).enabledRegex).to.equal(true)
  })
  it('should not have anything in this.placeholdersForRegex if there are no regexOps', function () {
    expect(articleWithImages.placeholdersForRegex.length).to.equal(0)
  })
  describe('static ._escapeRegExp', function () {
    it('should escape regex properly', function () {
      const str = '\\ ^ $ * + ? . ( ) | { } [ ]'
      const escaped = Article._escapeRegExp(str)
      const regexp = new RegExp(escaped)
      expect(regexp.test(str)).to.equal(true)
    })
  })
  describe('static ._findImages', function () {
    it('should iterate over every object key and call the function if it is one', function () {
      const obj = { foo: 'bar', fun: () => 3 }
      const checkType = sinon.stub(Article, '_checkType')
      const results = []
      Article._findImages(obj, results)
      sinon.assert.calledWith(checkType, obj.foo, results)
      sinon.assert.calledWith(checkType, obj.fun, results)
      checkType.restore()
    })
  })
  describe('static ._checkType', function () {
    let results
    before(function () {
      results = []
    })
    describe('with an object input', function () {
      it('should return a function if the item is an object', function () {
        expect(Article._checkType({}, results)).to.be.a('function')
        expect(results.length).to.equal(0)
      })
    })
    describe('with a string input', function () {
      it('should not explicitly return a value', function () {
        expect(Article._checkType('', results)).to.equal(undefined)
      })
      it('should not change the results array if the string is not an image', function () {
        Article._checkType('https://www.example.com/', results)
        expect(results.length).to.equal(0)
      })
      it('should push the string into the results array if it is an image string', function () {
        Article._checkType('https://www.example.com/a.jpg', results)
        expect(results.length).to.equal(1)
      })
      it('should automatically append http if there are only slashes in front of a image string', function () {
        Article._checkType('//www.example.com/a.jpg', results)
        expect(results.length).to.equal(2)
        expect(results[1]).to.equal('http://www.example.com/a.jpg')
      })
    })
  })

  describe('static ._evalRegexConfig', function () {
    it('should return null when the placeholder type is in the regexOps.disabled array', function () {
      expect(Article._evalRegexConfig(regexOps, '', 'title')).to.be.a('null')
    })
    it('should return null when a regexOp is not an array', function () {
      expect(Article._evalRegexConfig(regexOps, '', 'link')).to.equal(null)
    })
    it('should return an object when there is only one regexOp for a placeholder type and it has disabled set to true', function () {
      expect(Article._evalRegexConfig(regexOps, '', 'description').constructor).to.equal(Object)
    })
    it('should return an object for non-disabled regexOp', function () {
      const regexRep = sinon.stub(Article, '_regexReplace')
      expect(Article._evalRegexConfig(regexOps, '', 'summary').constructor).to.equal(Object)
      regexRep.restore()
    })
  })

  describe('static ._regexReplace', function () {
    it('should throw a TypeError if searchOptions is not an object', function () {
      expect(() => Article._regexReplace()).to.throw(TypeError)
    })
    it('should return the original string if the searchOptions.regex did not match anything in the string', function () {
      const returnVal = Article._regexReplace('animals', { regex: 'foobar' })
      expect(returnVal).to.equal('animals')
    })
    it('should return the original string for ridiculous group and match numbers', function () {
      const str = 'the lazy fox jumped over'
      const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: '(jumped) (over)', group: 666, match: 696969 })
      expect(returnVal).to.equal(str)
    })
    describe('when replacement is defined', function () {
      it('should replace the matched items in the string if searchOptions.regex matched', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: 'lazy' }, '')
        expect(returnVal).to.equal('the  fox jumped over')
      })
      it('should return the string with replaced matches when searchOptions.group is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: '(jumped) (over)', group: 2 }, '')
        expect(returnVal).to.equal('the lazy fox jumped ')
      })
      it('should return the string with replaced matches when searchOptions.match is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over\nhe jumped over', { regex: '.*(jumped) (over)', match: 1 }, '')
        expect(returnVal).to.equal('the lazy fox jumped over\n')
      })
      it('should return the string with replaced matches when searchOptions.match and searchOptions.group is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over\nhe jumped and hopped over', { regex: '.*(jumped)(.*)(over)', match: 1, group: 2 }, '')
        expect(returnVal).to.equal('the lazy fox jumped over\nhe jumpedover')
      })
    })
    describe('when replacement is undefined', function () {
      it('should return the matched item in the string if searchOptions.regex matched', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: 'lazy' })
        expect(returnVal).to.equal('lazy')
      })
      it('should return the correct match when searchOptions.group is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: '(jumped) (over)', group: 2 })
        expect(returnVal).to.equal('over')
      })
      it('should return the correct match when searchOptions.match is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over\nhe jumped over', { regex: '.*(jumped) (over)', match: 1 })
        expect(returnVal).to.equal('he jumped over')
      })
      it('should return the correct match when searchOptions.match and searchOptions.group is defined', function () {
        const returnVal = Article._regexReplace('the lazy fox jumped over\nhe jumped and hopped over', { regex: '.*(jumped)(.*)(over)', match: 1, group: 2 })
        expect(returnVal).to.equal(' and hopped ')
      })
    })



  })

  describe('static ._cleanup', function () {
    let images, hrefs
    before(function () {
      images = []
      hrefs = []
    })
    it('should return a string', function () {
      const resultString = Article._cleanup({}, '')
      expect(resultString).to.be.a('string')
    })
    it('should add images to the input array if found', function () {
      Article._cleanup({}, '<img src="https://www.example.com/fox.jpg"/>', images)
      expect(images.length).to.equal(1)
      expect(images[0]).to.equal('https://www.example.com/fox.jpg')
    })
    it('should add anchor links to the input array if found', function () {
      Article._cleanup({}, '<a href="https://www.example.com/"/>', [], hrefs)
      expect(hrefs[0]).to.equal('https://www.example.com/')
    })
    it('should prepend http: if an image is missing it', function () {
      Article._cleanup({}, '<img src="//www.example.com/fox.jpg"/>', images)
      expect(images.length).to.equal(2)
      expect(images[1]).to.equal('http://www.example.com/fox.jpg')
    })
    it('should remove images from string if feedConfig.imagLinksExistence is false', function () {
      const returnString = Article._cleanup({ imageLinksExistence: false }, 'woof <img src="https://www.example.com/fox.jpg"/>', images)
      expect(returnString).to.equal('woof')
    })
    it('should prepend image srcs found during node traversal with http:// if the protocol is missing', function () {
      const images = []
      const returnString = Article._cleanup({}, 'woof <img src="www.example.com/fox.webp"/>', images)
      expect(returnString).to.equal('woof http://www.example.com/fox.webp')
      expect(images.length).to.equal(1)
      expect(images[0]).to.equal('http://www.example.com/fox.webp')
    })
  })

  describe('title', function () {
    describe('images', function () {
      let titleImages
      before(function () {
        titleImages = ['https://www.example.com/title1.jpg', 'https://www.example.com/title2.jpg']
      })
      it('should be pushed into this.titleImages', function () {
        expect(articleWithImages.titleImages).to.have.members(titleImages)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 0; i < titleImages.length; ++i) expect(articleWithImages[`title:image${i + 1}`]).to.equal(titleImages[i])
      })
      it('should push placeholders into this.placeholdersForRegex if regexOps is defined', function () {
        const articleWithImagesAndRegex = new Article(rawArticleWithImages, { regexOps: {} })
        const additional = titleImages.map((item, i) => `title:image${i + 1}`)
        expect(articleWithImagesAndRegex.placeholdersForRegex).to.include.members(Article.BASE_REGEX_PHS.concat(additional))
      })
    })
    describe('anchors', function () {
      let titleAnchors
      before(function () {
        titleAnchors = ['https://www.example.com/titlehref2', 'https://www.example.com/titlehref1'] // Reversed anchor order due to html-to-text way of traversing nodes
      })
      it('should be pushed into this.titleAnchors', function () {
        expect(articleWithImages.titleAnchors).to.have.members(titleAnchors)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 0; i < titleAnchors.length; ++i) expect(articleWithImages[`title:anchor${i + 1}`]).to.equal(titleAnchors[i])
      })
      it('should push placeholders into this.placeholdersForRegex if regexOps is defined', function () {
        const articleWithImagesAndRegex = new Article(rawArticleWithImages, { regexOps: {} })
        const additional = titleAnchors.map((item, i) => `title:anchor${i + 1}`)
        expect(articleWithImagesAndRegex.placeholdersForRegex).to.include.members(Article.BASE_REGEX_PHS.concat(additional))
      })
    })
  })

  describe('description', function () {
    describe('images', function () {
      let descriptionImages
      before(function () {
        descriptionImages = ['https://www.example.com/description1.png', 'https://www.example.com/description2.png']
      })
      it('should be pushed into this.descriptionImages', function () {
        expect(articleWithImages.descriptionImages).to.have.members(descriptionImages)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 0; i < descriptionImages.length; ++i) expect(articleWithImages[`description:image${i + 1}`]).to.equal(descriptionImages[i])
      })
      it('should push placeholders into this.placeholdersForRegex if regexOps is defined', function () {
        const articleWithImagesAndRegex = new Article(rawArticleWithImages, { regexOps: {} })
        const additional = descriptionImages.map((item, i) => `description:image${i + 1}`)
        expect(articleWithImagesAndRegex.placeholdersForRegex).to.include.members(Article.BASE_REGEX_PHS.concat(additional))
      })
    })
    describe('anchors', function () {
      let descriptionAnchors
      before(function () {
        descriptionAnchors = ['https://www.example.com/descriptionhref2', 'https://www.example.com/descriptionhref1'] // Reversed anchor order due to html-to-text way of traversing nodes
      })
      it('should be pushed into this.descriptionAnchors', function () {
        expect(articleWithImages.descriptionAnchors).to.have.members(descriptionAnchors)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 0; i < descriptionAnchors.length; ++i) expect(articleWithImages[`description:anchor${i + 1}`]).to.equal(descriptionAnchors[i])
      })
      it('should push placeholders into this.placeholdersForRegex if regexOps is defined', function () {
        const articleWithImagesAndRegex = new Article(rawArticleWithImages, { regexOps: {} })
        const additional = descriptionAnchors.map((item, i) => `description:anchor${i + 1}`)
        expect(articleWithImagesAndRegex.placeholdersForRegex).to.include.members(Article.BASE_REGEX_PHS.concat(additional))
      })
    })
  })

  describe('summary', function () {
    describe('images', function () {
      let summaryImages
      before(function () {
        summaryImages = ['https://www.example.com/summary1.jpeg', 'https://www.example.com/summary2.jpeg']
      })
      it('should be pushed into this.summaryImages', function () {
        expect(articleWithImages.summaryImages).to.have.members(summaryImages)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 1; i <= summaryImages.length; ++i) expect(articleWithImages['summary:image' + i]).to.equal(summaryImages[i - 1])
      })
    })
    describe('anchors', function () {
      let summaryAnchors
      before(function () {
        summaryAnchors = ['https://www.example.com/summaryhref2', 'https://www.example.com/summaryhref1'] // Reversed anchor order due to html-to-text way of traversing nodes
      })
      it('should be pushed into this.summaryAnchors', function () {
        expect(articleWithImages.summaryAnchors).to.have.members(summaryAnchors)
      })
      it('should have the correct placeholders added to this object', function () {
        for (let i = 1; i <= summaryAnchors.length; ++i) expect(articleWithImages['summary:anchor' + i]).to.equal(summaryAnchors[i - 1])
      })
    })
  })

  describe('images found as raw properties', function () {
    let images
    before(function () {
      images = ['https://www.example.com/image1.gif', 'https://www.example.com/image2.gif', 'https://www.example.com/image3.gif', 'https://www.example.com/image4.gif']
    })
    it('should be pushed into this.images', function () {
      expect(articleWithImages.images).to.have.members(images)
    })
    it('should have the correct placeholders added to this object', function () {
      for (let i = 1; i <= images.length; ++i) expect(articleWithImages['image:' + i]).to.equal(images[i - 1])
    })
  })
})
