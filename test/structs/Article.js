/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const nock = require('nock')
const fs = require('fs')
const unconvertedArticle = JSON.parse(fs.readFileSync('./test/files/article.json'))
const nestedImages = JSON.parse(fs.readFileSync('./test/files/nestedImages.json'))
const regexOps = JSON.parse(fs.readFileSync('./test/files/regexOps.json'))

describe('Article', function () {
  before(function () {
    process.env.feedwatch_test = true
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
    it('should put all images in a deeply nested object in an array', function () {
      const expectedImages = [ 'https://www.foobar.com/one.jpg',
        'https://www.foobar.com/three.jpeg',
        'https://www.foobar.com/five.png',
        'https://www.foobar.com/seven.gif',
        'https://www.foobar.com/nine.bmp',
        'https://www.foobar.com/eleven.webp',
        '//www.foobar.com/eleven.web' ]
      const results = []
      Article._findImages(nestedImages, results)
      expect(results.length).to.equal(7)
      for (const url of results) expectedImages.splice(expectedImages.indexOf(url), 1)
      expect(expectedImages.length).to.equal(0)
    })
  })

  describe('static ._evalRegexConfig', function () {
    it('should return null when the placeholder type is in the regexOps.disabled array', function () {
      expect(Article._evalRegexConfig(regexOps, '', 'title')).to.be.a('null')
    })
    it('should return an empty object when there is only one regexOp for a placeholder type and it has disabled set to true', function () {
      const results = Article._evalRegexConfig(regexOps, '', 'description')
      expect(Object.keys(results).length).to.equal(0)
      expect(results.constructor).to.equal(Object)
    })
    it('should replace the original text with content replaced if replacement key is defined', function () {
      const inputText = 'foobar binge'
      const results = Article._evalRegexConfig(regexOps, inputText, 'author')
      expect(results.constructor).to.equal(Object)
      expect(results).to.have.keys('authorname')
      expect(results.authorname).to.equal(' binge')
    })
    it('should return the matched content if replacement key is not defined', function () {
      const inputText = 'foobar binge'
      const results = Article._evalRegexConfig(regexOps, inputText, 'authortwo')
      expect(results.constructor).to.equal(Object)
      expect(results).to.have.keys('authortwoname')
      expect(results.authortwoname).to.equal('foobar')
    })
    it('should evaluate multiple regexOps properly', function () {
      const inputText = 'foobar foobar2 foobar3'
      const results = Article._evalRegexConfig(regexOps, inputText, 'summary')
      expect(results.constructor).to.equal(Object)
      expect(results).to.have.keys(['summarynameone', 'summarynametwo'])
      expect(results.summarynameone).to.equal(' 2 3')
      expect(results.summarynametwo).to.equal('foobar foobar3 foobar3')
    })
    it('should chain multiple regexOps properly', function () {
      const inputText = 'foobar foobar2 foobar3'
      const results = Article._evalRegexConfig(regexOps, inputText, 'summarytwo')
      expect(results.constructor).to.equal(Object)
      expect(results).to.have.keys('summarychained')
      expect(results.summarychained).to.equal(' replaced2 3')
    })
    // describe('feedConfig with regexOps key "disabled" array has a field', function () {
    //   it('should return null when the field is the input', function () {

    //   })
    //   it('should return an object when the field is not the input', function () {
    //     const feedConfig = { regexOps: { disabled: ['description'], title: [] } }
    //     expect(Article._evalRegexConfig(feedConfig, '', 'title')).to.be.a('object')
    //   })
    // })
    // describe('feedConfig')
  })
})
