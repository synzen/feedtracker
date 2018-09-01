const getArticles = require('../util/getArticles.js')
const logic = require('../util/logic.js')

process.on('message', async m => {
  const currentBatch = m.currentBatch
  const nockFile = m.nockFile
  if (nockFile) require('nock')('http://localhost').get('/feed.xml').reply(m.statusCode || 200, nockFile).persist()
  // let a = 0
  // setInterval(() => {
  //   console.log('pinging ' + a)
  // }, 1000)
  const len = Object.keys(currentBatch).length
  let c = 0
  for (let feedJSON of currentBatch) {
    getArticles(feedJSON.link).then(articleList => {
      logic({ articleList: articleList, feedJSON: feedJSON }, (err, results) => {
        if (err) console.log(err)
        if (results) process.send(results)
      })
      if (++c === len) process.send({ status: 'batch_connected' })
    }).catch(err => {
      process.send({ status: 'failed', link: feedJSON.link, id: feedJSON.id, errMessage: err.message })
    })
  }
})
