/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const sinon = require('sinon')
const fs = require('fs')
const regexOps = JSON.parse(fs.readFileSync('./test/files/regexOps.json'))

describe('Unit::Article', function () {
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
    it('should replace the matched items in the string if searchOptions.regex matched and replacement is defined', function () {
      const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: 'lazy' }, '')
      expect(returnVal).to.equal('the  fox jumped over')
    })
    it('should return the matched item in the string if searchOptions.regex matched and replacement is undefined', function () {
      const returnVal = Article._regexReplace('the lazy fox jumped over', { regex: 'lazy' })
      expect(returnVal).to.equal('lazy')
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
      Article._cleanup({}, '<img src="https://www.example.com/fox.jpg"/>', images, [])
      expect(images.length).to.equal(1)
      expect(images[0]).to.equal('https://www.example.com/fox.jpg')
    })
    it('should add anchor links to the input array if found', function () {
      Article._cleanup({}, '<a href="https://www.example.com/"/>', [], hrefs)
      expect(hrefs[0]).to.equal('https://www.example.com/')
    })
    it('should prepend http: if an image is missing it', function () {
      Article._cleanup({}, '<img src="//www.example.com/fox.jpg"/>', images, [])
      expect(images.length).to.equal(2)
      expect(images[1]).to.equal('http://www.example.com/fox.jpg')
    })
    it('should remove images from string if feedConfig.imagLinksExistence is false', function () {
      const returnString = Article._cleanup({ imageLinksExistence: false }, 'woof <img src="https://www.example.com/fox.jpg"/>', images, [])
      expect(returnString).to.equal('woof')
    })
  })
})
