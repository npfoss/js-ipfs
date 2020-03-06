/* eslint-env mocha */
'use strict'

const { fixtures, expectPinned, clearPins } = require('./utils')
const { getDescribe, getIt, expect } = require('../utils/mocha')
const all = require('it-all')
const drain = require('it-drain')

/** @typedef { import("ipfsd-ctl/src/factory") } Factory */
/**
 * @param {Factory} common
 * @param {Object} options
 */
module.exports = (common, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)

  describe('.pin.rm', function () {
    this.timeout(50 * 1000)

    let ipfs
    before(async () => {
      ipfs = (await common.spawn()).api

      await Promise.all(fixtures.files.map(file => {
        return all(ipfs.add(file.data, { pin: false }))
      }))

      await all(
        ipfs.add(fixtures.directory.files.map(
          file => ({
            path: file.path,
            content: file.data
          })
        ), {
          pin: false
        })
      )
    })

    after(() => common.clean())

    beforeEach(() => {
      return clearPins(ipfs)
    })

    it('should remove a recursive pin', async () => {
      await drain(ipfs.pin.add(fixtures.directory.cid))

      const removedPinset = await all(ipfs.pin.rm(fixtures.directory.cid, { recursive: true }))
      expect(removedPinset.map(p => p.cid)).to.deep.equal([fixtures.directory.cid])

      const pinset = await all(ipfs.pin.ls({ type: 'recursive' }))
      expect(pinset).to.not.deep.include({
        cid: fixtures.directory.cid,
        type: 'recursive'
      })
    })

    it('should remove a direct pin', async () => {
      await drain(ipfs.pin.add(fixtures.directory.cid, { recursive: false }))

      const removedPinset = await all(ipfs.pin.rm(fixtures.directory.cid, { recursive: false }))
      expect(removedPinset.map(p => p.cid)).to.deep.equal([fixtures.directory.cid])

      const pinset = await all(ipfs.pin.ls({ type: 'direct' }))
      expect(pinset.map(p => p.cid)).to.not.deep.include(fixtures.directory.cid)
    })

    it('should fail to remove an indirect pin', async () => {
      await drain(ipfs.pin.add(fixtures.directory.cid))

      await expect(drain(ipfs.pin.rm(fixtures.directory.files[0].cid)))
        .to.eventually.be.rejected()
        .with(/is pinned indirectly under/)
      await expectPinned(ipfs, fixtures.directory.files[0].cid)
    })

    it('should fail when an item is not pinned', async () => {
      await expect(drain(ipfs.pin.rm(fixtures.directory.cid)))
        .to.eventually.be.rejected()
        .with(/is not pinned/)
    })

    it('should pipe the output of ls to rm', async () => {
      await drain(ipfs.pin.add(fixtures.directory.cid))

      await drain(ipfs.pin.rm(ipfs.pin.ls({ type: 'recursive' })))

      await expect(all(ipfs.pin.ls())).to.eventually.have.lengthOf(0)
    })
  })
}