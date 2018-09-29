const Feed = require('./Feed.js')
const EventEmitter = require('events')
const Schedule = require('./Schedule.js')

class Fetcher extends EventEmitter {
  constructor (interval) {
    super()
    this.Feed = Feed
    this.Schedule = Schedule
    if (!interval) return
    this.defaultSchedule = new Schedule(interval, 'default')
    this.defaultSchedule.on('article', article => this.emit('article', article))
    this.defaultSchedule.on('err', (err, link) => this.emit(err, link))
    this.schedules = [ this.defaultSchedule ]
    const defaultInterval = setInterval(() => this.defaultSchedule._run(), this.defaultSchedule.interval)
    this._intervals = [ defaultInterval ]
  }

  async addFeeds (feeds, schedule) {
    if (schedule && !(schedule instanceof Schedule)) throw new TypeError('Second argument is not of type Schedule')
    if (schedule) await schedule.addFeeds(feeds)
    else await this.defaultSchedule.addFeeds(feeds)
  }

  async addFeed (feed, schedule) {
    if (schedule && !(schedule instanceof Schedule)) throw new TypeError('Second argument is not of type Schedule')
    if (schedule) await schedule.addFeed(feed)
    else await this.defaultSchedule.addFeed(feed)
  }

  addSchedule (schedule) {
    if (!(schedule instanceof Schedule)) throw new TypeError('No Schedule provided to addSchedule')
    for (const existingSchedule of this.schedules) {
      if (existingSchedule.name === schedule.name) throw new Error(`Schedule name ${schedule.name} already exists`)
    }
    this.schedules.push(schedule)
    this._intervals.push(setInterval(() => schedule._run(), schedule.interval))
  }
}

module.exports = Fetcher
