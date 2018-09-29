const Feed = require('./Feed.js')
const EventEmitter = require('events')
const Schedule = require('./Schedule.js')

class Fetcher extends EventEmitter {
  constructor (interval) {
    super()
    this.Feed = Feed
    this.Schedule = Schedule
    this.schedules = []
    this._intervals = []
    if (!interval) return
    this.defaultSchedule = new Schedule(interval, 'default', { _overrideDefault: true })
    this.defaultSchedule.on('article', article => this.emit('article', article))
    this.defaultSchedule.on('err', (err, link) => this.emit('err', err, link))
    this.schedules.push(this.defaultSchedule)
    const defaultInterval = setInterval(() => this.defaultSchedule._run(), this.defaultSchedule.interval)
    this._intervals.push(defaultInterval)
  }

  async addFeeds (feeds, scheduleName) {
    if (this.schedules.length === 0) throw new Error('No schedules added')
    if (this.defaultSchedule && !scheduleName) scheduleName = 'default'
    if (typeof scheduleName !== 'string') throw new TypeError('Schedule name must be specified as a string')
    let added = false
    for (const schedule of this.schedules) {
      if (schedule.name === scheduleName) {
        added = true
        await schedule.addFeeds(feeds)
      }
    }
    if (!added) throw new Error(`Specified schedule ${scheduleName} does not exist`)
  }

  async addFeed (feed, scheduleName) {
    if (this.schedules.length === 0) throw new Error('No schedules added')
    if (this.defaultSchedule && !scheduleName) scheduleName = 'default'
    if (typeof scheduleName !== 'string') throw new TypeError('Schedule name must be specified as a string')
    let added = false
    for (const schedule of this.schedules) {
      if (schedule.name === scheduleName) {
        added = true
        await schedule.addFeed(feed)
      }
    }
    if (!added) throw new Error(`Specified schedule ${scheduleName} does not exist`)
  }

  addSchedule (schedule) {
    if (!(schedule instanceof Schedule)) throw new TypeError('No Schedule provided to addSchedule')
    for (const existingSchedule of this.schedules) {
      if (existingSchedule.name === schedule.name) {
        throw new Error(`Schedule name ${schedule.name} already exists`)
      }
    }
    this.schedules.push(schedule)
    this._intervals.push(setInterval(() => schedule._run(), schedule.interval))
    schedule.on('article', article => this.emit('article', article))
    schedule.on('err', (err, link) => this.emit('err', err, link))
  }
}

module.exports = Fetcher
