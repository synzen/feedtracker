/* eslint-env mocha */

const chai = require('chai')
const proxyquire = require('proxyquire')
const expect = chai.expect

describe('Unit::concurrent method', function () {
  describe('getArticles resolved', function () {
    let data
    let mockResults
    before(function () {
      data = { currentBatch: [ { link: 'foobar' } ] }
      mockResults = { foo: 'bar' }
    })
    describe('logic callsback results', function () {
      let concurrent
      before(function () {
        concurrent = proxyquire('../../methods/concurrent.js', {
          '../util/getArticles.js': async (link, reqOptions) => {
            return []
          },
          '../util/logic.js': (data, callback) => {
            callback(null, mockResults)
          }

        })
      })
      it('should callback no error as the first arg and results in the second arg', function (done) {
        concurrent(data, (err, results) => {
          try {
            expect(err).to.equal(null)
            expect(results).to.equal(results)
            done()
          } catch (err) {
            done(err)
          }
        })
      })
    })
    describe('logic callsback error', function () {
      let concurrent
      before(function () {
        concurrent = proxyquire('../../methods/concurrent.js', {
          '../util/getArticles.js': async (link, reqOptions) => {
            return []
          },
          '../util/logic.js': (data, callback) => {
            callback(new Error('force an error'))
          }
        })
      })
      it('should callback an error and no results', function (done) {
        concurrent(data, (err, results) => {
          try {
            expect(err).to.be.a('error')
            expect(results).to.equal(undefined)
            done()
          } catch (err) {
            done(err)
          }
        })
      })
    })
  })
  describe('getArticles rejected', function () {
    let concurrent
    let mockResults
    let err
    before(function () {
      err = new Error('oh no')
      mockResults = { status: 'failed', link: 'foobar', err }
      concurrent = proxyquire('../../methods/concurrent.js', {
        '../util/getArticles.js': async (link, reqOptions) => {
          throw err
        },
        '../util/logic.js': (data, callback) => {
          throw new Error('Logic should not have been run if getArticles was rejected')
        }
      })
    })
    it('should callback no error and failed status result', function (done) {
      concurrent({ currentBatch: [ { link: 'foobar' } ] }, (err, results) => {
        try {
          expect(err).to.equal(null)
          expect(results).to.deep.equal(mockResults)
          done()
        } catch (err) {
          done(err)
        }
      })
    })
  })
})
