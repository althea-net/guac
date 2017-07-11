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
  sign
} = require('./utils.js')

module.exports = async (test, instance) => {
  test('updateState happy path', async t => {
    const snapshot = await takeSnapshot()
    const eventLog = instance.allEvents()

    const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'

    const sequenceNumber = 1

    const balance0 = 5
    const balance1 = 7

    const hashlocks = '0x'

    await createChannel(instance)

    const fingerprint = solSha3(
      'updateState',
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      hashlocks
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    await instance.updateState(
      channelId,
      sequenceNumber,
      
      balance0,
      balance1,
      
      hashlocks,

      signature0,
      signature1
    )

    const logs = await p(eventLog.get.bind(eventLog))()
    console.log('logs', filterLogs(logs))
    eventLog.stopWatching()

    await revertSnapshot(snapshot)
  })
}

async function createChannel (instance) {
  console.log('createChannel start')
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
  console.log('createChannel end')
}