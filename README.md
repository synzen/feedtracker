# FeedWatch

[![Coverage Status](https://coveralls.io/repos/github/synzen/FeedWatch/badge.svg?branch=master)](https://coveralls.io/github/synzen/FeedWatch?branch=master) [![Build Status](https://travis-ci.org/synzen/FeedWatch.svg?branch=master)](https://travis-ci.org/synzen/FeedWatch.svg?branch=master) [![Dependency Status](https://david-dm.org/synzen/FeedWatch.svg)](https://david-dm.org/synzen/FeedWatch.svg)

A non-Discord bot version of [Discord.RSS](https://github.com/synzen/Discord.RSS), built upon the same reliable, time-tested logic to track RSS feeds and receive new articles.

This repo is a work in progress - more documentation to follow, as well as tests.

## Quick Start
```js
const Tracker = require('./index.js')

const fetcher = new Tracker.Fetcher(10000) // Time in ms to check for new articles
const feed = new Tracker.Feed("https://myfeed.com/rss.xml")
fetcher.addFeed(feed)


fetcher.on('article', article => {
    // The article object is an Article object with processed values (that cleans up HTML/etc.). To get the raw article object, use article.raw.
})

fetcher.on('err', (err, link) => {
    // Link connection errors during fetch cycles
})
```

