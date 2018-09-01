/* eslint-env mocha */

const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs')
const EventEmitter = require('events')
const proxyquire = require('proxyquire')
let Schedule = require('../../structs/Schedule.js')
const Feed = require('../../structs/Feed.js')
const Article = require('../../structs/Article.js')

describe('Unit::Schedule', function () {
  let FeedMock
  before(function () {
    FeedMock = class {
      constructor () { this.id = Math.random(1000) }
      toJSON () { }
      _overwriteOldArticles () { }
    }
  })
  describe('.addFeeds()', function () {
    let schedule
    before(function () {
      schedule = new Schedule()
    })
    it('should return a Promise', function () {
      const prom = schedule.addFeeds([])
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    describe('with Array input', function () {
      it('should resolve', function () {
        return schedule.addFeeds([])
      })
      describe('with non-Feed items', function () {
        it('should reject', function (done) {
          schedule.addFeeds([1, 2, 3])
            .then(() => done(new Error('Promise was resolved with non-Array input')))
            .catch(() => done())
        })
      })
      describe('with Feed items', function () {
        let feeds
        let stubs
        before(function () {
          feeds = []
          stubs = []
          for (let i = 0; i < 5; ++i) {
            const feed = new Feed('foobar')
            const stub = sinon.stub(feed, '_initialize')
            stub.resolves([])
            stubs.push(stub)
            feeds.push(feed)
          }
        })
        it('should resolve with an Array of Feeds as input', function (done) {
          const prom = schedule.addFeeds(feeds)
          prom.then(() => {
            stubs.forEach(stub => stub.restore())
            done()
          }).catch(err => {
            stubs.forEach(stub => stub.restore())
            done(err)
          })
        })
        it(`should add to this.feeds object keys length by the right amount`, function () {
          expect(Object.keys(schedule.feeds).length).to.equal(feeds.length)
        })
        it('should add the right keys to this.feeds object', function () {
          const ids = feeds.map(feed => feed.id)
          expect(schedule.feeds).to.have.all.keys(ids)
        })
      })
    })

    it('should reject with non-Array input', function (done) {
      schedule.addFeeds()
        .then(() => done(new Error('Promise was resolved with non-Array input')))
        .catch(() => done())
    })
  })

  describe('.addFeed()', function () {
    let schedule
    before(function () {
      schedule = new Schedule()
    })
    describe('with non-Feed input', function () {
      it('should reject with TypError on non-Feed input', function (done) {
        schedule.addFeed()
          .then(() => {
            done(new Error('Promise was resolved with non-Feed input'))
          })
          .catch(() => done())
      })
    })
    describe('with Feed input', function () {
      let feed
      let stub
      before(function () {
        feed = new Feed('link')
        stub = sinon.stub(feed, '_initialize').resolves([])
      })
      it('should resolve', function (done) {
        schedule.addFeed(feed)
          .then(() => {
            stub.restore()
            done()
          })
          .catch(err => {
            stub.restore()
            done(err)
          })
      })
      it('should add to this.feeds object keys length by 1', async function () {
        expect(Object.keys(schedule.feeds).length).to.equal(1)
      })
      it('should have the added the right keys in this.feeds object', function () {
        expect(schedule.feeds).to.have.all.keys(feed.id)
      })
    })
  })

  describe('._run()', function () {
    let schedule
    let getBatchStub
    let getBatchParallelStub
    before(function () {
      schedule = new Schedule()
      getBatchStub = sinon.stub(schedule, '_getBatch').resolves()
      getBatchParallelStub = sinon.stub(schedule, '_getBatchParallel').resolves()
    })
    after(function () {
      getBatchStub.restore()
      getBatchParallelStub.restore()
    })
    it('should return a promise', function () {
      const prom = schedule._run()
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should not run any methods when there are no batches', async function () {
      await schedule._run()
      sinon.assert.notCalled(getBatchStub)
      sinon.assert.notCalled(getBatchParallelStub)
    })
    it('should create the right number of batches', async function () {
      schedule.batchSize = 2
      for (let i = 0; i < 10; ++i) {
        schedule.feeds[Math.random() * 1000] = new FeedMock()
      }
      await schedule._run()
      expect(schedule._batchList.length).to.equal(5)
    })
    it('should run concurrent method by default', function () {
      sinon.assert.calledOnce(getBatchStub)
      sinon.assert.calledWith(getBatchStub, 0, schedule._batchList)
    })
    it('should run parallel-isolated when explicitly specified', async function () {
      schedule.processingMethod = 'parallel-isolated'
      await schedule._run()
      sinon.assert.calledOnce(getBatchStub)
      sinon.assert.calledOnce(getBatchParallelStub)
    })
  })

  describe('._getBatch()', function () {
    const callbackFeedJSONId = 123
    const callbackSeenArticleList = []
    it('returns a promise', function () {
      const schedule = new Schedule()
      schedule.feeds[callbackFeedJSONId] = new FeedMock()
      const prom = schedule._getBatch(0, [[new FeedMock()]])
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should resolve with no batches in the batchList', function () {
      const schedule = new Schedule()
      return schedule._getBatch(0, [])
    })
    describe('err callback', function () {
      let schedule
      before(function () {
        Schedule = proxyquire('../../structs/Schedule.js', {
          '../methods/concurrent.js': (data, callback) => {
            const { currentBatch } = data
            currentBatch.forEach(item => callback(new Error()))
          }})
        schedule = new Schedule()
      })
      it('should emit err', async function () {
        const emitStub = sinon.stub(schedule, 'emit')
        await schedule._getBatch(0, [[new FeedMock()]])
        expect(emitStub.calledOnce).to.equal(true)
        const call0 = emitStub.getCall(0)
        expect(call0.args[0]).to.equal('err')
        expect(call0.args[1]).to.be.a('error')
        emitStub.restore()
      })
    })
    describe('status:success callback', function () {
      let schedule
      before(function () {
        Schedule = proxyquire('../../structs/Schedule.js', {
          '../methods/concurrent.js': (data, callback) => {
            const { currentBatch } = data
            currentBatch.forEach(item => callback(null, { status: 'success', feedJSONId: callbackFeedJSONId, seenArticleList: callbackSeenArticleList }))
          }
        })
        schedule = new Schedule()
        schedule.feeds[callbackFeedJSONId] = new FeedMock()
      })
      it('should recursively call itself the correct number of times based on the number of batchLists', async function () {
        const batchListOne = [[new FeedMock()]]
        const batchListTwo = [[new FeedMock()], [new FeedMock(), new FeedMock()]]
        const batchListThree = [[new FeedMock(), new FeedMock()], [new FeedMock()], [new FeedMock()]]
        const spy = sinon.spy(schedule, '_getBatch')
        await schedule._getBatch(0, batchListOne)
        expect(spy.callCount === 1).to.equal(true)
        await schedule._getBatch(0, batchListTwo)
        expect(spy.callCount === 3).to.equal(true)
        await schedule._getBatch(0, batchListThree)
        expect(spy.callCount === 6).to.equal(true)
        spy.restore()
      })
      it('should call the _finishCycle after all batches are processed', async function () {
        const scheduleFinishCycle = sinon.stub(schedule, '_finishCycle')
        await schedule._getBatch(0, [[new FeedMock(), new FeedMock()], [new FeedMock()], [new FeedMock()]])
        expect(scheduleFinishCycle.calledOnce).to.equal(true)
      })
    })
    describe('status:failed callback', function () {
      let schedule
      before(function () {
        Schedule = proxyquire('../../structs/Schedule.js', {
          '../methods/concurrent.js': (data, callback) => {
            const { currentBatch } = data
            currentBatch.forEach(item => callback(null, { status: 'failed', err: new Error(), link: 'foobar' }))
          }
        })
        schedule = new Schedule()
      })
      it('should emit err', async function () {
        const emitStub = sinon.stub(schedule, 'emit')
        await schedule._getBatch(0, [[new FeedMock(), new FeedMock()]])
        expect(emitStub.calledTwice).to.equal(true)
        const call0 = emitStub.getCall(0)
        const call1 = emitStub.getCall(1)
        expect(call0.args[0]).to.equal('err') // the event name
        expect(call0.args[1]).to.be.a('error')
        expect(call0.args[2]).to.be.a('string')
        expect(call1.args[0]).to.equal('err')
        emitStub.restore()
      })
      it('should recursively call itself the correct number of times based on the number of batchLists', async function () {
        const batchListOne = [[new FeedMock()]]
        const batchListTwo = [[new FeedMock()], [new FeedMock(), new FeedMock()]]
        const batchListThree = [[new FeedMock(), new FeedMock()], [new FeedMock()], [new FeedMock()]]
        const spy = sinon.spy(schedule, '_getBatch')
        await schedule._getBatch(0, batchListOne)
        expect(spy.callCount === 1).to.equal(true)
        await schedule._getBatch(0, batchListTwo)
        expect(spy.callCount === 3).to.equal(true)
        await schedule._getBatch(0, batchListThree)
        expect(spy.callCount === 6).to.equal(true)
        spy.restore()
      })
      it('should call the _finishCycle after all batches are processed', async function () {
        const scheduleFinishCycle = sinon.stub(schedule, '_finishCycle')
        await schedule._getBatch(0, [[new FeedMock(), new FeedMock()], [new FeedMock()], [new FeedMock()]])
        expect(scheduleFinishCycle.calledOnce).to.equal(true)
      })
    })
    describe('status:article callback', function () {
      const emitCount = 2
      let article
      let schedule
      before(function () {
        Schedule = proxyquire('../../structs/Schedule.js', {
          '../methods/concurrent.js': (data, callback) => {
            const { currentBatch } = data
            for (let i = 0; i < emitCount; ++i) callback(null, { status: 'article', article: article, link: 'foobar' })
            currentBatch.forEach(item => callback(null, { status: 'success', feedJSONId: callbackFeedJSONId, seenArticleList: callbackSeenArticleList }))
          }
        })
        article = JSON.parse(fs.readFileSync('./test/files/article.json'))
        // article.pubdate = new Date(article.pubdate)
        schedule = new Schedule()
      })
      it('should emit articles', async function () {
        const emitStub = sinon.stub(schedule, 'emit')
        schedule.feeds[123] = new FeedMock()
        await schedule._getBatch(0, [[new FeedMock()]])
        expect(emitStub.calledTwice).to.equal(true)
        const call0 = emitStub.getCall(0)
        const call1 = emitStub.getCall(1)
        expect(call0.args[0]).to.equal('article') // the event name
        expect(call0.args[1]).to.be.instanceof(Article)
        expect(call1.args[0]).to.equal('article')
        emitStub.restore()
      })
    })
  })

  describe('._getBatchParallel', function () {
    const callbackFeedJSONId = 123
    it('returns a promise', function () {
      const schedule = new Schedule()
      schedule.feeds[callbackFeedJSONId] = new FeedMock()
      const prom = schedule._getBatchParallel(0, [[new FeedMock()]])
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should resolve with no batches in the batchList', function () {
      const schedule = new Schedule()
      return schedule._getBatch(0, [])
    })
    describe.skip('status:success message', function () {
      let schedule
      before(function () {
        Schedule = proxyquire('../../structs/Schedule.js', {
          'child_process': {
            fork: () => new EventEmitter()
          }
        })
        schedule = new Schedule()
        schedule.feeds[callbackFeedJSONId] = new FeedMock()
      })
    })
  })

  describe('._finishCycle()', function () {
    let schedule
    before(function () {
      schedule = new Schedule()
      schedule._batchList.push(1)
      expect(schedule._batchList.length).to.equal(1)
    })
    it('should clear the batchList', async function () {
      await schedule._finishCycle()
      expect(schedule._batchList.length).to.equal(0)
    })
  })
})
