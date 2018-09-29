# FeedTracker

[![Coverage Status](https://coveralls.io/repos/github/synzen/FeedWatch/badge.svg?branch=master)](https://coveralls.io/github/synzen/FeedWatch?branch=master) [![Build Status](https://travis-ci.org/synzen/FeedTracker.svg?branch=master)](https://travis-ci.org/synzen/FeedTracker) [![dependencies Status](https://david-dm.org/synzen/FeedWatch/status.svg)](https://david-dm.org/synzen/FeedWatch)

A non-Discord bot version of [Discord.RSS](https://github.com/synzen/Discord.RSS), built upon the same reliable, time-tested logic to track RSS feeds and receive new articles.

This repo is a work in progress.

## Quick Start
```js
const Tracker = require('feedtracker')

const fetcher = new Tracker.Fetcher(10000) // Time in ms to check for new articles
const feed = new Tracker.Feed(url)
fetcher.addFeed(feed)
.then(() => /* success */)
.catch(err => /* handle error */)


fetcher.on('article', article => {
    // The article object is an Article object with processed values (that cleans up HTML/etc.). To get the raw article object, use article.raw.
})

fetcher.on('err', (err, link) => {
    // Link connection errors during fetch cycles
})
```
## Basic Functions
#### Adding Multiple Feeds
```js
const Tracker = require('feedtracker')
const links = [url1, url2, url3]

const fetcher = new Tracker.Fetcher(10000) // Time in ms
fetcher.addFeeds(links)
.then(() => /* success */)
.catch(err => /* handle error */)

// Then add fetcher listeners

```

#### Fetch feeds on different intervals
```js
const Tracker = require('feedtracker')

const fetcher = new Tracker.Fetcher(10000) // Time in ms
fetcher.addSchedule(new Tracker.Schedule(20000, 'my name'))
fetcher.addFeed(new Tracker.Feed(url))
.then(() => fetcher.addFeed(new Tracker.Feed(url2), 'my name') // Add this feed to the new schedule. Omit the name for the default one)
.then(() => /* success */)

fetcher.on('article', handler)
fetcher.on('err', errHandler)

```
