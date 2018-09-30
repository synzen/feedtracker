/* eslint-env mocha */

const expect = require('chai').expect
const Article = require('../../structs/Article.js')
const sinon = require('sinon')
const Schedule = require('../../structs/Schedule.js')
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
  describe('.addFeed()', function () {
    it('should return a promise', async function () {
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      const schedule = new Schedule(1, 'name')
      const prom = schedule.addFeed(url)
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should add to this.feeds by 1', async function () {
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      const schedule = new Schedule(1, 'name')
      await schedule.addFeed(url)
      expect(Object.keys(schedule.feeds).length).to.equal(1)
    })
    it('should have the added feed in this.feeds for this schedule', async function () {
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      const schedule = new Schedule(1, 'name')
      const feed = await schedule.addFeed(url)
      expect(schedule.feeds).to.have.all.keys([feed.id])
    })
  })

  describe('.addFeeds()', function () {
    const toAdd = []
    let scope
    before(function () {
      for (let i = 0; i < 2; ++i) toAdd.push(url)
      scope = nock('http://localhost').persist().get('/feed.xml').reply(200, feed2Articles)
    })
    after(function () {
      scope.persist(false)
      nock.cleanAll()
    })
    it('should return a promise', function () {
      const schedule = new Schedule(1, 'name')
      const prom = schedule.addFeeds(toAdd)
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it(`should add to this.feeds the right amount`, async function () {
      const schedule = new Schedule(1, 'name')
      await schedule.addFeeds(toAdd)
      expect(Object.keys(schedule.feeds).length).to.equal(toAdd.length)
    })
    it(`should have the added feeds in this.feeds for this schedule`, async function () {
      const schedule = new Schedule(1, 'name')
      const feeds = await schedule.addFeeds(toAdd)
      const addedIds = feeds.map(f => f.id)
      const ids = []
      for (let id in schedule.feeds) ids.push(id)
      expect(ids).to.have.members(addedIds)
    })
    it('should popuate _articleList of objects for every feed', async function () {
      const schedule = new Schedule(1, 'name')
      await schedule.addFeeds(toAdd)
      for (let id in schedule.feeds) {
        const feed = schedule.feeds[id]
        expect(feed._articleList.length).to.be.greaterThan(0)
      }
    })
    it('should reject with a single invalid feed', function (done) {
      const schedule = new Schedule(1, 'name')
      schedule.addFeeds([url, 1, 2])
        .then(() => done(new Error('Promise resolved with invalid feed array contents')))
        .catch(() => done())
    })
  })

  describe('concurrent processing method', function () {
    let schedule
    before(async function () {
      nock.cleanAll()
      schedule = new Schedule(1, 'name')
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      await schedule.addFeed(url)
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
    before(async function () {
      nock.cleanAll()
      schedule = new Schedule(100, '', { processingMethod: 'parallel-isolated' })
      nock('http://localhost').get('/feed.xml').reply(200, feed2Articles)
      await schedule.addFeed(url)
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
