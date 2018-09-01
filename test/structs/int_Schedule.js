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

describe('Int::Schedule', function () {
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
    after(function () {
      scope.persist(false)
      nock.cleanAll()
    })
    it(`should add to this.feeds the right amount`, async function () {
      await addFeedsPromise
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
    describe('with Array input', function () {
      it('with Feed array contents should resolve the promise', async function () {
        await schedule.addFeeds([new Feed(url), new Feed(url)])
      })
      it('with non-Feed array contents should reject the promise', function (done) {
        schedule.addFeeds([new Feed(url), 1, 2])
          .then(() => done(new Error('Promise resolved with non-Feed array contents')))
          .catch(() => done())
      })
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
    it('should reject on non-Feed input', function (done) {
      schedule.addFeed()
        .then(() => done(new Error('Promise resolved with a non-Feed input')))
        .catch(() => done())
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
    })
    after(function () {
      nock.cleanAll()
    })
    it('should emit "article" on new articles', async function () {
      const spy = sinon.spy()
      schedule.on('article', spy)
      nock('http://localhost').get('/feed.xml').reply(200, feed3Articles)
      await schedule._run()
      expect(spy.calledOnce).to.equal(true)
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
  describe('parallel-isolated processing method', function () {
    let schedule
    let feed
    before(async function () {
      nock.cleanAll()
      schedule = new Schedule(0, '', { processingMethod: 'parallel-isolated' })
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      feed = new Feed(url)
      await schedule.addFeed(feed)
    })
    after(function () {
      nock.cleanAll()
    })
    it('should emit "article" on new articles', async function () {
      const spy = sinon.spy()
      schedule.on('article', spy)
      await schedule._run(feed3Articles)
      expect(spy.calledOnce).to.equal(true)
    })
    it('should not emit "article" when there are no new articles in the xml', async function () {
      const spy = sinon.spy()
      schedule.on('article', spy)
      await schedule._run(feed3Articles)
      expect(spy.notCalled).to.equal(true)
    })
    it('should have an Article and the feed link in the "article" listener args', async function () {
      nock.cleanAll()
      const spy = sinon.spy()
      schedule.on('article', spy)
      await schedule._run(feed4Articles)
      expect(spy.calledOnce).to.equal(true)
      expect(spy.getCall(0).args[0]).to.be.an.instanceOf(Article)
      expect(spy.getCall(0).args[1]).to.equal(url)
    })
    it('should emit "err" once on feeds with non-200 status codes', async function () {
      const spy = sinon.spy()
      schedule.on('err', spy)
      await schedule._run(feed4Articles, 500)
      expect(spy.calledOnce).to.equal(true)
    })
  })
})
