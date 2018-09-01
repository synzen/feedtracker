/* eslint-env mocha */

const chai = require('chai')
const expect = chai.expect
const Feed = require('../../structs/Feed.js')
const nock = require('nock')
const fs = require('fs')
const feedTwoArticles = fs.readFileSync('./test/files/feed2Articles.xml')

describe('Int::Feed', function () {
  const feed = new Feed('http://localhost/feed.xml')
  before(function () {
    nock('http://localhost').get('/feed.xml').reply(200, feedTwoArticles)
  })

  describe('.getArticles()', function () {
    it('should resolve with an array', async function () {
      const arr = await feed.getArticles()
      expect(arr).to.be.an('array')
    })
  })
})
