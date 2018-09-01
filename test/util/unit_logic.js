/* eslint-env mocha */

const logic = require('../../util/logic.js')
const sinon = require('sinon')
const expect = require('chai').expect
const fs = require('fs')

describe('Unit::logic', function () {
  let feedJSON
  let feedJSONEmptySeen
  let article2List
  let article3List
  const articleObjectKeys = ['status', 'article', 'link']
  const successObjectKeys = ['status', 'link', 'seenArticleList', 'feedJSONId']
  before(function () {
    feedJSON = JSON.parse(fs.readFileSync('./test/files/feedJSON.json'))
    feedJSONEmptySeen = JSON.parse(fs.readFileSync('./test/files/feedJSONEmptySeen.json'))
    article2List = JSON.parse(fs.readFileSync('./test/files/article2List.json'))
    article3List = JSON.parse(fs.readFileSync('./test/files/article3List.json'))
  })
  describe('with empty seenArticleList and article2List', function () {
    it('should callback with a success object', function () {
      const spy = sinon.spy()
      logic({ articleList: article2List, feedJSON: feedJSONEmptySeen }, spy)
      expect(spy.lastCall.args[0]).to.be.a('null')
      expect(spy.lastCall.args[1]).to.be.a('object').and.have.keys(successObjectKeys)
    })
    it('should not callback any articles since it is likely first time initialization', function () {
      const spy = sinon.spy()
      logic({ articleList: article2List, feedJSON: feedJSONEmptySeen }, spy)
      const spyCalls = spy.getCalls()
      spyCalls.forEach(call => expect(call.args[1].status).to.not.equal('article'))
    })
  })
  describe('with the same seenArticleList and article2List', function () {
    it('should callback with a success object', function () {
      const spy = sinon.spy()
      logic({ articleList: article2List, feedJSON }, spy)
      expect(spy.lastCall.args[0]).to.be.a('null')
      expect(spy.lastCall.args[1]).to.be.a('object').and.have.keys(successObjectKeys)
    })
    it('should not callback any articles', function () {
      const spy = sinon.spy()
      logic({ articleList: article2List, feedJSON }, spy)
      const spyCalls = spy.getCalls()
      spyCalls.forEach(call => expect(call.args[1].status).to.not.equal('article'))
    })
    it('should give the same seenArticleList as the input article2List (the ones that were already seen)', function () {
      const spy = sinon.spy()
      logic({ articleList: article2List, feedJSON }, spy)
      expect(JSON.stringify(article2List)).to.equal(JSON.stringify(spy.lastCall.args[1].seenArticleList))
    })
  })
  describe('with smaller seenArticleList and larger articleList', function () {
    it('should callback with a success object', function () {
      const spy = sinon.spy()
      logic({ articleList: article3List, feedJSON }, spy)
      expect(spy.lastCall.args[0]).to.be.a('null')
      expect(spy.lastCall.args[1]).to.be.a('object').and.have.keys(successObjectKeys)
    })
    it('should callback with an object with article status with all relevant keys', function () {
      const spy = sinon.spy()
      logic({ articleList: article3List, feedJSON }, spy)
      expect(spy.calledTwice).to.equal(true)
      expect(spy.firstCall.args[0]).to.be.a('null')
      expect(spy.firstCall.args[1]).to.have.keys(articleObjectKeys)
      expect(spy.firstCall.args[1].status).to.equal('article')
      expect(spy.lastCall.args[0]).to.be.a('null')
      expect(spy.lastCall.args[1]).to.have.keys(successObjectKeys)
      expect(spy.lastCall.args[1].status).to.be.equal('success')
    })
    it('should add to the seenArticleList by the right amount', function () {
      const spy = sinon.spy()
      const origSeenLen = article2List.length
      const diffLen = article3List.length - article2List.length
      logic({ articleList: article3List, feedJSON }, spy)
      expect(spy.lastCall.args[0]).to.be.a('null')
      expect(spy.lastCall.args[1]).to.be.a('object')
      expect(spy.lastCall.args[1].seenArticleList.length - origSeenLen).to.equal(diffLen)
    })
    describe('with title checks on', function () {
      let titleChecksFeedJSON
      before(function () {
        titleChecksFeedJSON = { ...feedJSON, checkTitles: true }
      })
      describe('comparing a new article with the same title', function () {
        let sameTitleArticle3List
        before(function () {
          sameTitleArticle3List = JSON.parse(JSON.stringify(article3List))
          sameTitleArticle3List[article3List.length - 1].title = sameTitleArticle3List[article3List.length - 2].title
        })
        it('should not emit an article', function () {
          const spy = sinon.spy()
          logic({ articleList: sameTitleArticle3List, feedJSON: titleChecksFeedJSON }, spy)
          expect(spy.calledOnce).to.equal(true)
          expect(spy.lastCall.args[0]).to.be.a('null')
          expect(spy.lastCall.args[1]).to.have.keys(successObjectKeys)
        })
        describe('with a different description and a description customComparison', function () {
          it('should emit an article', function () {
            const spy = sinon.spy()
            logic({ articleList: sameTitleArticle3List, feedJSON: { ...titleChecksFeedJSON, customComparisons: ['description'] } }, spy)
            expect(spy.calledTwice).to.equal(true)
            expect(spy.firstCall.args[0]).to.be.a('null')
            expect(spy.firstCall.args[1]).to.have.keys(articleObjectKeys)
            expect(spy.lastCall.args[0]).to.be.a('null')
            expect(spy.lastCall.args[1]).to.have.keys(successObjectKeys)
          })
        })
      })
    })
    describe('with date checks on', function () {
      let checkDatesFeedJSON =
      before(function () {
        checkDatesFeedJSON = { ...feedJSON, checkDates: true }
      })
      describe('comparing a new article that is older than a day', function () {
        let olderThanADayArticle3List
        before(function () {
          const now = new Date()
          olderThanADayArticle3List = JSON.parse(JSON.stringify(article3List))
          now.setDate(now.getDate() - 2)
          olderThanADayArticle3List[article3List.length - 1].pubdate = now
        })
        it('should not emit an article', function () {
          const spy = sinon.spy()
          logic({ articleList: olderThanADayArticle3List, feedJSON: checkDatesFeedJSON }, spy)
          expect(spy.calledOnce).to.equal(true)
          expect(spy.lastCall.args[0]).to.be.a('null')
          expect(spy.lastCall.args[1]).to.have.keys(successObjectKeys)
        })
      })
      describe('comparing a new article this not older than a day', function () {
        let newerThanADayArticle3List
        before(function () {
          newerThanADayArticle3List = JSON.parse(JSON.stringify(article3List))
          newerThanADayArticle3List[article3List.length - 1].pubdate = new Date()
        })
        it('should emit an article', function () {
          const spy = sinon.spy()
          logic({ articleList: newerThanADayArticle3List, feedJSON: checkDatesFeedJSON }, spy)
          expect(spy.calledTwice).to.equal(true)
          expect(spy.firstCall.args[0]).to.be.a('null')
          expect(spy.firstCall.args[1]).to.have.keys(articleObjectKeys)
          expect(spy.lastCall.args[0]).to.be.a('null')
          expect(spy.lastCall.args[1]).to.have.keys(successObjectKeys)
        })
      })
    })
  })
})
