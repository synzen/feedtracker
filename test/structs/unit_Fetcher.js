/* eslint-env mocha */

const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
const Feed = require('../../structs/Feed.js')
const Schedule = require('../../structs/Schedule.js')
const Fetcher = require('../../structs/Fetcher.js')

describe('Unit::Fetcher', function () {
  let dummySchedule
  let dummyScheduleName
  before(function () {
    dummyScheduleName = 'foobar'
    dummySchedule = { name: dummyScheduleName, addFeed: () => Promise.resolve(), addFeeds: () => Promise.resolve() }
  })
  describe('with no interval provided to constructor', function () {
    it('should not initialize a default schedule to this.defaultSchedule', function () {
      const fetcher = new Fetcher()
      expect(fetcher.defaultSchedule).to.equal(undefined)
    })
  })

  describe('with an interval provided to constructor', function () {
    let fetcherWithInterval
    before(function () {
      fetcherWithInterval = new Fetcher(10)
    })
    after(function () {
      clearInterval(fetcherWithInterval._intervals[0]) // Clear the interval so there's nothing left for the process to run
    })
    it('should initialize a default schedule to this.defaultSchedule as a Schedule', function () {
      expect(fetcherWithInterval.defaultSchedule).to.be.instanceof(Schedule)
    })
    it('should populate .schedules', function () {
      expect(fetcherWithInterval.schedules.length).to.equal(1)
    })
    it('should populate ._intervals', function () {
      expect(fetcherWithInterval._intervals.length).to.equal(1)
    })

    describe('default schedule', function () {
      it('emitting "article" should cause the fetcher to emit the same things', function () {
        const spy = sinon.spy()
        fetcherWithInterval.on('article', spy)
        fetcherWithInterval.defaultSchedule.emit('article', 'foobar')
        expect(spy.calledOnce).to.equal(true)
        expect(spy.calledWithExactly('foobar')).to.equal(true)
      })
      it('emitting "err" should cause the fetcher to emit the same things', function () {
        const spy = sinon.spy()
        fetcherWithInterval.on('err', spy)
        fetcherWithInterval.defaultSchedule.emit('err', 'foobar', 'jack')
        expect(spy.calledOnce).to.equal(true)
        expect(spy.calledWithExactly('foobar', 'jack')).to.equal(true)
      })
    })
  })

  describe('.addFeed', function () {
    it('should return a Promise', function () {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.schedules[0] = dummySchedule
      const prom = fetcher.addFeed(feed, dummyScheduleName)
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should reject when there are no schedules in .schedules array', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.addFeed(feed, dummyScheduleName)
        .then(() => done(new Error('Promise was resolved when schedules array was empty')))
        .catch(() => done())
    })
    it('should reject when schedule name arg is not a string but fetcher.schedules is populated', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.schedules.push(1)
      fetcher.addFeed(feed, 123)
        .then(() => done(new Error('Promise was resolved when schedules array was empty')))
        .catch(err => {
          if (err instanceof TypeError) done()
          else done(new Error('Error was not an instance of TypeError'))
        })
    })
    it('should reject when schedule name arg was not found in fetcher schedules', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      // Add some mock schedules
      fetcher.defaultSchedule = { name: 'default', addFeed: () => Promise.resolve() }
      fetcher.schedules.push(fetcher.defaultSchedule)
      fetcher.addFeed(feed, 'dummdum')
        .then(() => done(new Error('Promise was resolved when schedule name was not in schedules list of fetcher')))
        .catch(() => done())
    })
    it('should add to this.defaultSchedule when no schedule name is passed in as an arg, if default schedule exists', async function () {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.defaultSchedule = { name: 'default', addFeed: () => Promise.resolve() }
      fetcher.schedules.push(fetcher.defaultSchedule)
      const spy = sinon.spy(fetcher.defaultSchedule, 'addFeed')
      await fetcher.addFeed(feed)
      expect(spy.calledOnce).to.equal(true)
    })
  })

  describe('.addFeeds', function () {
    it('should return a Promise', function () {
      const feed = new Feed('adz')
      const fetcher = new Fetcher()
      fetcher.schedules[0] = dummySchedule
      const prom = fetcher.addFeeds([feed], dummyScheduleName)
      expect(prom.then).to.be.a('function')
      expect(prom.catch).to.be.a('function')
    })
    it('should reject when there are no schedules in .schedules array', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.addFeeds([feed], dummyScheduleName)
        .then(() => done(new Error('Promise was resolved when schedules array was empty')))
        .catch(() => done())
    })
    it('should reject when schedule name arg is not a string but fetcher.schedules is populated', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.schedules.push(1)
      fetcher.addFeeds([feed], 123)
        .then(() => done(new Error('Promise was resolved when schedules array was empty')))
        .catch(err => {
          if (err instanceof TypeError) done()
          else done(new Error('Error was not an instance of TypeError'))
        })
    })
    it('should reject when schedule name arg was not found in fetcher schedules', function (done) {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      // Add some mock schedules
      fetcher.defaultSchedule = { name: 'default', addFeeds: () => Promise.resolve() }
      fetcher.schedules.push(fetcher.defaultSchedule)
      fetcher.addFeeds([feed], 'dummdum')
        .then(() => done(new Error('Promise was resolved when schedule name was not in schedules list of fetcher')))
        .catch(() => done())
    })
    it('should add to this.defaultSchedule when no schedule name is passed in as an arg, if default schedule exists', async function () {
      const feed = new Feed('hfo')
      const fetcher = new Fetcher()
      fetcher.defaultSchedule = { name: 'default', addFeeds: () => Promise.resolve() }
      fetcher.schedules.push(fetcher.defaultSchedule)
      const spy = sinon.spy(fetcher.defaultSchedule, 'addFeeds')
      await fetcher.addFeeds([feed])
      expect(spy.calledOnce).to.equal(true)
    })
  })

  describe('addSchedule', function () {
    it('should throw a TypeError when arg is not a Schedule', function () {
      const fetcher = new Fetcher()
      expect(() => fetcher.addSchedule(123)).to.throw(TypeError)
    })
    it('should throw an error when schedule name already exists in fetcher.schedules', function () {
      const fetcher = new Fetcher()
      fetcher.addSchedule(new Schedule(1, 'abc'))
      expect(() => fetcher.addSchedule(new Schedule(2, 'abc'))).to.throw(Error)
      fetcher._intervals.forEach(interval => clearInterval(interval))
    })
    it('should populate fetcher.schedules and fetcher._intervals', function () {
      const fetcher = new Fetcher()
      fetcher.addSchedule(new Schedule(1, 'abc'))
      expect(fetcher._intervals.length).to.equal(1)
      expect(fetcher.schedules.length).to.equal(1)
      fetcher._intervals.forEach(interval => clearInterval(interval))
    })
    it('should create an article listener for the schedule that then emits to the fetcher', function () {
      const fetcher = new Fetcher()
      const schedule = new Schedule(1, 'abc')
      const spy = sinon.spy()
      fetcher.addSchedule(schedule)
      fetcher._intervals.forEach(interval => clearInterval(interval))
      fetcher.on('article', spy)
      schedule.emit('article', 'foobar')
      expect(spy.calledOnce).to.equal(true)
      expect(spy.calledWithExactly('foobar')).to.equal(true)
    })
    it('should create an err listener for the schedule that then emits to the fetcher', function () {
      const fetcher = new Fetcher()
      const schedule = new Schedule(1, 'abc')
      const spy = sinon.spy()
      fetcher.addSchedule(schedule)
      fetcher._intervals.forEach(interval => clearInterval(interval))
      fetcher.on('err', spy)
      schedule.emit('err', 'foobar', 'foobar2')
      expect(spy.calledOnce).to.equal(true)
      expect(spy.calledWithExactly('foobar', 'foobar2')).to.equal(true)
    })
  })
})
