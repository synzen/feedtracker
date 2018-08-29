A non-Discord bot version of [Discord.RSS](https://github.com/synzen/Discord.RSS), built upon the same reliable, time-tested logic to track feeds and receive new articles. 

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

This repo is a work in progress - more documentation to follow, as well as tests.
