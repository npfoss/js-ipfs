/* eslint-env mocha */
'use strict'

const { Buffer } = require('buffer')
const { getDescribe, getIt, expect } = require('../../utils/mocha')

/** @typedef { import("ipfsd-ctl/src/factory") } Factory */
/**
 * @param {Factory} common
 * @param {Object} options
 */
module.exports = (common, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)

  describe('.object.patch.setData', function () {
    this.timeout(80 * 1000)

    let ipfs

    before(async () => {
      ipfs = (await common.spawn()).api
    })

    after(() => common.clean())

    it('should set data for an existing node', async () => {
      const obj = {
        Data: Buffer.from('patch test object'),
        Links: []
      }
      const patchData = Buffer.from('set')

      const nodeCid = await ipfs.object.put(obj)
      const patchedNodeCid = await ipfs.object.patch.setData(nodeCid, patchData)
      const patchedNode = await ipfs.object.get(patchedNodeCid)

      expect(nodeCid).to.not.deep.equal(patchedNodeCid)
      expect(patchedNode.Data).to.eql(patchData)
    })

    it('returns error for request without key & data', () => {
      return expect(ipfs.object.patch.setData(null, null)).to.eventually.be.rejected.and.be.an.instanceOf(Error)
    })

    it('returns error for request without data', () => {
      const filePath = 'test/fixtures/test-data/badnode.json'

      return expect(ipfs.object.patch.setData(null, filePath)).to.eventually.be.rejected.and.be.an.instanceOf(Error)
    })
  })
}
