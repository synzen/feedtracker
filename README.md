# feedtracker

[![Coverage Status](https://coveralls.io/repos/github/synzen/FeedTracker/badge.svg?branch=master)](https://coveralls.io/github/synzen/FeedTracker?branch=master) [![Build Status](https://travis-ci.org/synzen/FeedTracker.svg?branch=master)](https://travis-ci.org/synzen/feedtracker) [![dependencies Status](https://david-dm.org/synzen/feedtracker/status.svg)](https://david-dm.org/synzen/feedtracker)

[![NPM](https://nodei.co/npm/feedtracker.png)](https://nodei.co/npm/feedtracker/)

Track RSS feeds and receive new articles.

## Quick Start
```js
const Tracker = require('feedtracker')

const fetcher = new Tracker.Fetcher(10000) // Time in ms to check for new articles
fetcher.addFeed(url)
.then(() => /* success */)
.catch(err => /* handle error */)


fetcher.on('article', (article, feedLink) => {
    // The article object is an Article object with processed values (that cleans up HTML/etc.). To get the raw article object, use article.raw.
})

fetcher.on('err', (err, feedLink) => {
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
fetcher.addSchedule(new Tracker.Schedule(20000, 'schedule name'))
fetcher.addFeed(url)
.then(() => fetcher.addFeed(url2, 'schedule name') // Add this feed to the new schedule. Omit the name for the default one)
.then(() => /* success */)

fetcher.on('article', handler)
fetcher.on('err', errHandler)

```
## API Table of Contents

* [Main Classes](#main-classes)
* [Utility Classes](#utility-classes)
* [Fetcher](#fetcher)
   * [Fetcher#addFeed(url[, scheduleName])](#fetcheraddfeedurl-schedulename)
   * [Fetcher#addFeeds(urls[, scheduleName])](#fetcheraddfeedsurls-schedulename)
   * [Fetcher#addSchedule(schedule)](#fetcheraddscheduleschedule)
   * [Fetcher#on(event[, args...])](#fetcheronevent-args)
* [Schedule](#schedule)
   * [Schedule#addFeed(feed)](#scheduleaddfeedfeed)
   * [Schedule#addFeeds(feed)](#scheduleaddfeedsfeeds)
   * [Schedule#on(event[, args...]](#scheduleonevent-args)
* [Feed](#feed)
   * [Feed#getArticles](#feedgetarticles)
   * [Feed#toJSON](#feedtojson)

***

### Main Classes

#### new Tracker.Fetcher([interval])
   * *Number* `interval` - Frequency of how long to request feeds for updates for an automatically created Schedule

Creates a fetcher. If no interval is specified, a default schedule is automatically created - otherwise schedules must be manually added with Fetcher#addSchedule to add feeds.

#### new Tracker.Schedule(interval, name[, options])
   * *Number* `interval` - Frequency of how long to request feeds for updates. Non-zero positive integer
   * *String* `name` - The name of the schedule. Purely for identification purposes
   * *Object* `options` - Object of options to configure the schedule
      * *String* `processingMethod` - Defines how feeds are fetched for efficiency. Either `"concurrent"` or `"parallel-isolated"`. Defaults to `"concurrent"`
      * *Number* `batchSize` - Number of feeds to request in one batch of concurrent requests. Applies to both `processingMethods` above. Defaults to `300`

Concurrent processing method is when feeds are fetched in the same process of fetcher (that the schedule belongs to). Parallel-isolated is when feeds are fetched in a forked child process. The latter method is much faster and more efficient for heavy use (several thousand feeds).

***

### Utility Classes

#### Article

A class made to auto-beautify the contents given by the feedparser by cleaning up the HTML and extracting useful items such as images and anchors. Accessed as the second argument to the article listener for `Tracker.Fetcher#on("article", article)` and `Tracker.Schedule#on("article", article)`.

Properties:
   * *Object* `raw` - The original object created by the feedparser
   * *String* `title` - Title of the article
   * *String* `author` - Author of the article
   * *String* `description` - Description of the article
   * *String* `summary` - Summary of the article
   * *String* `link` - Link of the article
   * *Array\<String\>* `tags` - Categories/tags of the article
   * *Array\<String\>* `imageLinks` - Image links found in the raw object values in all object depths
   * *Array\<String\>* `titleImages` - Image links found in the title
   * *Array\<String\>* `descriptionImages` - Image links found in the description
   * *Array\<String\>* `summaryImages` - Image links found in the summary
   * *Array\<String\>* `titleAnchors` - Anchor links found in the title
   * *Array\<String\>* `descriptionAnchors` - Anchor links found in the description
   * *Array\<String\>* `summaryAnchors` - Anchor links found in the summary

***

### Fetcher

#### Fetcher#addFeed(url[, scheduleName])
   * *String* `url` - URL of the feed
   * *String* `scheduleName` - Name of the schedule to add the feed to. Defaults to the default schedule if it exists

Returns a promise since it requests the feed to check if it is a valid (returns a valid parsable 200-code response). Do not use this to add multiple links - use the pluralized method (addFeeds) instead for faster concurrent requests. Resolves with a Tracker.Feed object.

#### Fetcher#addFeeds(urls[, scheduleName])
   * *Array\<String\>* `urls` - URLs of feeds
   * *String* `scheduleName` - Name of the schedule to add the feed to. Defaults to the default schedule if it exists

Returns a promise. Concurrently requests the urls for validation. Resolves with an array of Tracker.Feed objects. Rejects all the URLs if a single one fails.

#### Fetcher#addSchedule(schedule)
   * *Tracker.Schedule* `schedule` - The Schedule to add

Throws an error if the schedule name already exists.

#### Fetcher#on(event[, args...])
   * *String* `event` - There are two events to listen to
      * *String* `article` - Emitted whenever there is a new article found durng one of the feed check cycles
      * *String* `err` - Emitted whenever a link has an error (a feedparser error or connection error)
   * *String* `args...` - For the article event, there are two args - the article and the feed link. For the err event, there are two args - the error and the feed link, respectively - however the link is not available when the schedule's processingMethod is `parallel-isolated`

***

### Schedule

#### Schedule#addFeed(feed)
   * *String* `url` - URL of the feed

Returns a promise. Resolves with a Tracker.Feed object.

#### Schedule#addFeeds(feeds)
   * *Array\<String\>* `urls` - URLs of feeds

Returns a promise. Resolves with an array of Tracker.Feed objects. Rejects all the URLs if a single one fails.

#### Schedule#on(event[, args...])
   * *String* `event` - There are two events to listen to
      * *String* `article` - Emitted whenever there is a new article found durng one of the feed check cycles
      * *String* `err` - Emitted whenever a link has an error (a feedparser error or connection error)
   * *String* `args...` - For the article event, there are two args - the article and the feed link. For the err event, there are two args - the error and the feed link, respectively - however the link is not available when the schedule's processingMethod is `parallel-isolated`

***

### Feed

#### Feed#getArticles()

Returns a promise, and resolves with an array of the current articles by feedparsing the requested contents.

#### Feed#toJSON()

Returns a JSON representation of the the Feed instance.

***

## Testing

```
npm run mocha-test
```