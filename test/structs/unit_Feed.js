/* eslint-env mocha */

const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
const Feed = require('../../structs/Feed.js')
const nock = require('nock')
const fs = require('fs')
const feedTwoArticles = fs.readFileSync('./test/files/feed2Articles.xml')

describe('Unit::Feed', function () {
  const feed = new Feed('http://localhost/feed.xml')
  before(function () {
    nock('http://localhost').get('/feed.xml').reply(200, feedTwoArticles)
  })
  it('should generate a string id in constructor', function () {
    expect(feed.id).to.be.a('string')
    expect(feed.id).to.have.length.greaterThan(0)
  })
  describe('with no link in constructor', function () {
    it('should throw a TypeError', function () {
      expect(() => new Feed()).to.throw(TypeError)
    })
  })
  describe('.toJSON()', function () {
    const json = feed.toJSON()
    it('should return an object', function () {
      expect(json).to.be.a('object')
    })

    it('should have the proper keys', function () {
      expect(json).to.have.all.keys('id', 'link', 'options', 'requestOptions', 'seenArticleList')
    })
  })

  describe('.getArticles()', function () {
    let prom
    before(function () {
      prom = feed.getArticles()
    })
    it('should return a Promise', function () {
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
  })

  describe('._initialize', function () {
    it('should concat this._articleList with the resolved array array', async function () {
      const originalLength = feed._articleList.length
      const resolved = [1, 2]
      const getArticles = sinon.stub(feed, 'getArticles').resolves(resolved)
      await feed._initialize()
      expect(feed._articleList.length).to.equal(originalLength + resolved.length)
      getArticles.restore()
    })
  })
})
