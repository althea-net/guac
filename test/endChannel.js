// cook mango twist then skin sort option civil have still rather guilt

const test = require('blue-tape')
const p = require('util').promisify

const {
  ACCT_0_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_PRIVKEY,
  ACCT_1_ADDR,
} = require('./constants.js')

const {
  filterLogs,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  mineBlocks,
  createChannel,
  updateState,
  endChannel
} = require('./utils.js')

module.exports = async (test, instance) => {
  // endChannel happy path is tested in updateState.js
  test('endChannel nonexistant channel', async t => {
    const snapshot = await takeSnapshot()

    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    await createChannel(
      instance,
      channelId,
      6, 6,
      2
    )

    await updateState(
      instance,
      channelId,
      1,
      5, 7,
      '0x'
    )

    t.shouldFail(endChannel(
      instance,
      '0x2000000000000000000000000000000000000000000000000000000000000000'
    ))

    await revertSnapshot(snapshot)
  })

  test('endChannel already ended', async t => {
    const snapshot = await takeSnapshot()

    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    await createChannel(
      instance,
      channelId,
      6, 6,
      2
    )

    await updateState(
      instance,
      channelId,
      1,
      5, 7,
      '0x'
    )

    endChannel(
      instance,
      channelId
    )

    t.shouldFail(endChannel(
      instance,
      channelId
    ))

    await revertSnapshot(snapshot)
  })

  test.only('endChannel bad sig', async t => {
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const endChannelFingerprint = solSha3(
      'UH OH',
      channelId
    )

    t.shouldFail(instance.endChannel(
      channelId,
      sign(endChannelFingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    ))
  })
}
