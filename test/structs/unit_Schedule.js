/* eslint-env mocha */

const expect = require('chai').expect
const sinon = require('sinon')
const Schedule = require('../../structs/Schedule.js')
const Feed = require('../../structs/Feed.js')

describe('Unit::Schedule', function () {
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
    let FeedMock
    before(function () {
      schedule = new Schedule()
      getBatchStub = sinon.stub(schedule, '_getBatch').resolves()
      getBatchParallelStub = sinon.stub(schedule, '_getBatchParallel').resolves()
      FeedMock = class {
        toJSON () { return 1 }
      }
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

  })

  describe('._finishCycle()', function () {
    let schedule
    before(function () {
      schedule = new Schedule()
      schedule._batchList.push(1)
      expect(schedule._batchList.length).to.equal(1)
    })
    it('should clear the batchList', function () {
      schedule._finishCycle()
      expect(schedule._batchList.length).to.equal(0)
    })
  })
})
