/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const sinon = require('sinon')
const Schedule = require('../../structs/Schedule.js')
const Feed = require('../../structs/Feed.js')
const nock = require('nock')
const fs = require('fs')
const feed2Articles = fs.readFileSync('./test/files/feed2Articles.xml')
const feed3Articles = fs.readFileSync('./test/files/feed3Articles.xml')
const feed4Articles = fs.readFileSync('./test/files/feed4Articles.xml')

describe('Schedule', function () {
  let url
  before(function () {
    url = 'http://localhost/feed.xml'
  })
  describe('.addFeeds()', function () {
    const toAdd = []
    let addFeedsPromise
    let scope
    let toAddIds = []
    let schedule
    before(function () {
      schedule = new Schedule()
      for (let i = 0; i < 2; ++i) toAdd.push(new Feed(url))
      toAddIds = toAdd.map(v => v.id)
      scope = nock('http://localhost').persist().get('/feed.xml').reply(200, feed2Articles)
      addFeedsPromise = schedule.addFeeds(toAdd)
    })
    it('should return a Promise', function () {
      expect(addFeedsPromise.then).to.be.a('function')
      expect(addFeedsPromise.catch).to.be.a('function')
    })
    it(`should add to this.feeds the right amount`, async function () {
      await addFeedsPromise
      scope.persist(false)
      expect(Object.keys(schedule.feeds).length).to.equal(toAdd.length)
    })
    it(`should have the added feeds in this.feeds for this schedule`, function () {
      const ids = []
      for (let id in schedule.feeds) ids.push(id)
      expect(ids).to.have.members(toAddIds)
    })
    it('should popuate _articleList of objectsfor every feed', function () {
      for (let id in schedule.feeds) {
        const feed = schedule.feeds[id]
        expect(feed._articleList.length).to.be.greaterThan(0)
      }
    })
  })

  describe('.addFeed()', function () {
    let feed
    let addFeedPromise
    let previousFeedIds = []
    let schedule
    before(function () {
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      schedule = new Schedule()
      feed = new Feed(url)
      for (let id in schedule.feeds) previousFeedIds.push(id)
      schedule = new Schedule()
      addFeedPromise = schedule.addFeed(feed)
    })
    it('should return a Promise', function () {
      expect(addFeedPromise.then).to.be.a('function')
      expect(addFeedPromise.catch).to.be.a('function')
    })
    it('should add to this.feeds by 1', async function () {
      await addFeedPromise
      expect(Object.keys(schedule.feeds).length).to.equal(1)
    })
    it('should have the added feed in this.feeds for this schedule', function () {
      expect(schedule.feeds).to.have.all.keys(previousFeedIds.concat([feed.id]))
    })
  })

  describe('concurrent processing method', function () {
    let schedule
    let feed
    before(async function () {
      nock.cleanAll()
      schedule = new Schedule()
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      feed = new Feed(url)
      await schedule.addFeed(feed)
      fs.writeFileSync('./test/files/articleList.json', JSON.stringify(feed._articleList, null, 2))
    })
    it('should emit "article" on new articles', async function () {
      const spy = sinon.spy()
      schedule.on('article', spy)
      nock('http://localhost').get('/feed.xml').reply(200, feed3Articles)
      await schedule._run()
      expect(spy.calledOnce).to.equal(true)
      fs.writeFileSync('./test/files/articleListWithOneMore.json', JSON.stringify(feed._articleList, null, 2))
    })
    it('should not emit "article" when there are no new articles in the xml', async function () {
      nock('http://localhost').get('/feed.xml').reply(200, feed3Articles)
      const spy = sinon.spy()
      schedule.on('article', spy)
      expect(spy.notCalled).to.equal(true)
    })
    it('should have an Article and the feed link in the "article" listener args', async function () {
      nock.cleanAll()
      const spy = sinon.spy()
      schedule.on('article', spy)
      nock('http://localhost').get('/feed.xml').reply(200, feed4Articles)
      await schedule._run()
      expect(spy.calledOnce).to.equal(true)
      expect(spy.getCall(0).args[0]).to.be.an.instanceOf(Article)
      expect(spy.getCall(0).args[1]).to.equal(url)
    })
    it('should emit "err" once on feeds with non-200 status codes', async function () {
      nock('http://localhost').get('/feed.xml').reply(500, feed4Articles)
      const spy = sinon.spy()
      schedule.on('err', spy)
      await schedule._run()
      expect(spy.calledOnce).to.equal(true)
    })
  })
  describe.skip('parallel-isolated processing method')
})
