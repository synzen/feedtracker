/* eslint-env mocha */

const chai = require('chai')
const expect = chai.expect
const Feed = require('../../structs/Feed.js')
const nock = require('nock')
const fs = require('fs')
const feedTwoArticles = fs.readFileSync('./test/files/feed2Articles.xml')

describe('Feed', function () {
  const feed = new Feed('http://localhost/feed.xml')
  before(function () {
    nock('http://localhost').get('/feed.xml').reply(200, feedTwoArticles)
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
    it('should resolve with an array', async function () {
      const arr = await prom
      expect(arr).to.be.an('array')
    })
  })
})
