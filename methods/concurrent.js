const getArticles = require('../util/getArticles.js')
const logic = require('../util/logic.js')

module.exports = (data, callback) => {
  const { currentBatch } = data

  for (let feedJSON of currentBatch) {
    getArticles(feedJSON.link).then(articleList => {
      logic({ articleList: articleList, feedJSON: feedJSON }, (err, results) => {
        if (err) callback(err)
        if (results) callback(null, results)
      })
    }).catch(err => callback(null, { status: 'failed', link: feedJSON.link, err: err }))
  }
}
