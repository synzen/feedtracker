
const fetch = require('node-fetch')
const articleId = require('./articleId.js')
const FeedParser = require('feedparser')

module.exports = async (link, userRequestOptions) => {
  const options = {
    timeout: 20000,
    headers: {'user-agent': `Mozilla/5.0 ${link.includes('.tumblr.com') ? 'GoogleBot' : ''} (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36`},
    ...userRequestOptions
  }

  const res = await fetch(link, options)
  if (res.status !== 200) throw new Error(`Non-200 status code (${res.status})`)
  const feedparser = new FeedParser()
  res.body.pipe(feedparser)
  const articleList = []
  return new Promise((resolve, reject) => {
    // Error
    feedparser.once('error', err => {
      feedparser.removeAllListeners('end')
      reject(err)
    })

    // Readable
    feedparser.on('readable', function () {
      let item
      do {
        item = this.read()
        if (item) articleList.push(item)
      } while (item)
    })

    // End
    feedparser.once('end', () => {
      articleList.forEach(article => { article._id = articleId(articleList, article) })
      resolve(articleList)
    })
  })
}
