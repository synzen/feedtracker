/* eslint-env mocha */

const articleId = require('../../util/articleId.js')
const expect = require('chai').expect
const fs = require('fs')

describe('articleId', function () {
  let articleList
  let article
  before(function () {
    articleList = JSON.parse(fs.readFileSync('./test/files/articleList.json'))
    article = JSON.parse(fs.readFileSync('./test/files/article.json'))
  })
  it('should return a string', function () {
    expect(articleId(articleList, article)).to.be.a('string')
  })
})
