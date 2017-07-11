// cook mango twist then skin sort option civil have still rather guilt

const test = require('blue-tape')
const p = require('util').promisify

const {
  ACCT_0_PRIVKEY,
  ACCT_1_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_ADDR
} = require('./constants.js')

const {
  filterLogs,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign
} = require('./utils.js')

module.exports = async (test, instance) => {
  test('newChannel happy path', async t => {
    const snapshot = await takeSnapshot()
    const eventLog = instance.allEvents()

    await instance.mint(ACCT_0_ADDR, 12)
    await instance.mint(ACCT_1_ADDR, 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = ACCT_0_ADDR
    const address1 = ACCT_1_ADDR

    const balance0 = 6
    const balance1 = 6

    const challengePeriod = 2

    const fingerprint = solSha3(
      'newChannel',
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    await instance.newChannel(
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod,

      signature0,
      signature1
    )

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).c[0], 6)
    t.equal((await instance.balanceOf(ACCT_0_ADDR)).c[0], 6)

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [ '0x1000000000000000000000000000000000000000000000000000000000000000',
        
        '0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d',
        '0x25e27882eeb2159ad3164ed2622241740dfe0528',
        
        false, false,
        
        '2', '0',
        
        '6', '6', '12',
        
        '0x', '0' ]
    )

    const logs = await p(eventLog.get.bind(eventLog))()
    console.log('logs', filterLogs(logs))
    eventLog.stopWatching()

    await revertSnapshot(snapshot)
  })

  test('newChannel bad sig', async t => {
    const snapshot = await takeSnapshot()

    await instance.mint(ACCT_0_ADDR, 12)
    await instance.mint(ACCT_1_ADDR, 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = ACCT_0_ADDR
    const address1 = ACCT_1_ADDR

    const balance0 = 6
    const balance1 = 6

    const challengePeriod = 2

    const fingerprint = solSha3(
      'newChannel derp',
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    t.shouldFail(instance.newChannel(
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod,

      signature0,
      signature1
    ))

    await revertSnapshot(snapshot)
  })

  test('newChannel bad amount', async t => {
    const snapshot = await takeSnapshot()

    await instance.mint(ACCT_0_ADDR, 12)
    await instance.mint(ACCT_1_ADDR, 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = ACCT_0_ADDR
    const address1 = ACCT_1_ADDR

    const balance0 = 6
    const balance1 = 60000

    const challengePeriod = 2

    const fingerprint = solSha3(
      'newChannel',
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    t.shouldFail(instance.newChannel(
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod,

      signature0,
      signature1
    ))

    await revertSnapshot(snapshot)
  })

  test('newChannel already exists', async t => {
    const snapshot = await takeSnapshot()

    await instance.mint(ACCT_0_ADDR, 12)
    await instance.mint(ACCT_1_ADDR, 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = ACCT_0_ADDR
    const address1 = ACCT_1_ADDR

    const balance0 = 6
    const balance1 = 6

    const challengePeriod = 2

    const fingerprint = solSha3(
      'newChannel',
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    await instance.newChannel(
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod,

      signature0,
      signature1
    )

    t.shouldFail(instance.newChannel(
      channelId,

      address0,
      address1,

      balance0,
      balance1,

      challengePeriod,

      signature0,
      signature1
    ))

    await revertSnapshot(snapshot)
  })
}