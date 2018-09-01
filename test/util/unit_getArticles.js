/* eslint-env mocha */
const fs = require('fs')
const nock = require('nock')
const expect = require('chai').expect
const getArticles = require('../../util/getArticles.js')
const feedTwoArticles = fs.readFileSync('./test/files/feed2Articles.xml')
const htmlPage = fs.readFileSync('./test/files/nonfeed.html')

describe('Unit::getArticles', function () {
  let articles
  let url
  before(function () {
    url = 'http://localhost/feed.xml'
  })
  it('should return a promise', function () {
    nock('http://localhost').get('/feed.xml').reply(200, feedTwoArticles)
    const prom = getArticles(url)
    expect(prom.then).to.be.a('function')
    expect(prom.catch).to.be.a('function')
  })
  it('should resolve with an array', async function () {
    nock('http://localhost').get('/feed.xml').reply(200, feedTwoArticles)
    articles = await getArticles(url)
    expect(articles).to.be.a('array')
  })
  it('should add _id key to every item in array', function () {
    articles.forEach(item => expect(item._id).to.be.a('string'))
  })
  it('should reject with a non-feed link', function (done) {
    nock('http://localhost').get('/feed.xml').reply(200, htmlPage)
    getArticles(url)
      .then(() => done(new Error('Promise resolved with a non-feed link')))
      .catch(() => done())
  })
  it('should reject with a non-200 status code', function (done) {
    nock('http://localhost').get('/feed.xml').reply(500, feedTwoArticles)
    getArticles(url)
      .then(() => done(new Error('Promise with a non-200 status code')))
      .catch(() => done())
  })
})
