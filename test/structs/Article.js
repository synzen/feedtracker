/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const nock = require('nock')
const fs = require('fs')
const unconvertedArticle = JSON.parse(fs.readFileSync('./test/files/article.json'))
const nestedImages = JSON.parse(fs.readFileSync('./test/files/nestedImages.json'))

describe('Article', function () {
  before(function () {
    process.env.feedwatch_test = true
  })
  describe('escapeRegExp', function () {
    it('should escape regex properly', function () {
      const str = '\\ ^ $ * + ? . ( ) | { } [ ]'
      const escaped = Article._escapeRegExp(str)
      const regexp = new RegExp(escaped)
      expect(regexp.test(str)).to.equal(true)
    })
  })
  describe('findImages', function () {
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
})
