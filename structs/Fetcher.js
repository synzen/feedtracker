const Feed = require('./Feed.js')
const EventEmitter = require('events')
const Schedule = require('./Schedule.js')

class Fetcher extends EventEmitter {
  constructor (interval) {
    super()
    this.Feed = Feed
    this.Schedule = Schedule
    this.defaultSchedule = new Schedule('default', undefined, interval)
    this.defaultSchedule.on('article', article => this.emit('article', article))
    this.defaultSchedule.on('err', (err, link) => this.emit(err, link))
    this.schedules = [ this.defaultSchedule ]
    setInterval(() => {
      this.defaultSchedule._run()
    }, interval)
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
}

module.exports = Fetcher
