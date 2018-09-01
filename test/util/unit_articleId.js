/* eslint-env mocha */

const articleId = require('../../util/articleId.js')
const expect = require('chai').expect
const fs = require('fs')

describe('Unit::articleId', function () {
  let articleList
  let article
  before(function () {
    articleList = JSON.parse(fs.readFileSync('./test/files/article2List.json'))
    article = JSON.parse(fs.readFileSync('./test/files/article.json'))
    articleList.forEach(article => {
      article.pubdate = new Date(article.pubdate)
    })
    article.pubdate = new Date(article.pubdate)
  })
  it('should return a string', function () {
    expect(articleId(articleList, article)).to.be.a('string')
  })
  it('should return the guid by default', function () {
    expect(articleId(articleList, article)).to.equal(article.guid)
  })
  it('should return the title when there are equal guids for articles in articleList', function () {
    articleList.forEach(article => {
      article.guid = 'foobar'
    })
    expect(articleId(articleList, article)).to.equal(article.title)
  })
  it('should return the title when there is no guid for the article', function () {
    delete article.guid
    expect(articleId(articleList, article)).to.equal(article.title)
  })
  it('should return the pubdate when there is no guid and no title for the article', function () {
    delete article.guid
    delete article.title
    expect(articleId(articleList, article)).to.equal(article.pubdate)
  })
})
