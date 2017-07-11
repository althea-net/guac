// cook mango twist then skin sort option civil have still rather guilt

const test = require('blue-tape')
const p = require('util').promisify

const PaymentChannels = artifacts.require('PaymentChannels');

const {
  ACCT_0_PRIVKEY,
  ACCT_1_PRIVKEY
} = require('./constants.js')

const {
  filterLogs,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign
} = require('./utils.js')

test('PaymentChannels', async () => {
  const accounts = await p(web3.eth.getAccounts)()
  const instance = await PaymentChannels.deployed()

  test('newChannel happy path', async t => {
    const snapshot = await takeSnapshot()
    const eventLog = instance.allEvents()

    await instance.mint(accounts[0], 12)
    await instance.mint(accounts[1], 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = accounts[0]
    const address1 = accounts[1]

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

    t.equal((await instance.balanceOf(accounts[0])).c[0], 6)
    t.equal((await instance.balanceOf(accounts[0])).c[0], 6)

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [ '0x1000000000000000000000000000000000000000000000000000000000000000',
        
        '0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d',
        '0x25e27882eeb2159ad3164ed2622241740dfe0528',
        
        true, false,
        
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

    await instance.mint(accounts[0], 12)
    await instance.mint(accounts[1], 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = accounts[0]
    const address1 = accounts[1]

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

    await instance.mint(accounts[0], 12)
    await instance.mint(accounts[1], 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = accounts[0]
    const address1 = accounts[1]

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

    await instance.mint(accounts[0], 12)
    await instance.mint(accounts[1], 12)
      
    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const address0 = accounts[0]
    const address1 = accounts[1]

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
})
