/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const nock = require('nock')
const fs = require('fs')
const unconvertedArticle = fs.readFileSync('./test/files/article.json')

describe.skip('Article', function () {
  before(function () {
    process.env.feedwatch_test = true
  })
  describe('escapeRegExp', function () {
    it('should escape regex properly', function () {
      // expect(Article._escapeRegExp('\ ^ $ * + ? . ( ) | { } [ ]')).to.equal('\\\ \^ \$ \* \+ \? \. \( \) \| \{ \} \[ \]')
    })
  })
})
