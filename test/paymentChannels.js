// cook mango twist then skin sort option civil have still rather guilt


const test = require('blue-tape')
const leftPad = require('left-pad')
const p = require('util').promisify
const ethUtils = require('ethereumjs-util')

const PaymentChannels = artifacts.require('PaymentChannels');

const ACCT_0_PRIVKEY = '86de2cf259bf21a9aa2b8cf78f89ed479681001ca320c5762bb3237db65445cb'
const ACCT_0_ADDR = '0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d'

const ACCT_1_PRIVKEY = '06e744bba37fd1e630dc775d10fd8cbe0b5643f4d7187072d3d08df4b4118acf'
const ACCT_1_ADDR = '0x25e27882eeb2159ad3164ed2622241740dfe0528'

test('PaymentChannels', async () => {
  const accounts = await p(web3.eth.getAccounts)()
  const instance = await PaymentChannels.deployed()
  // const snapshot = await takeSnapshot()

  test('submitPreimage', async t => {
    // const snapshot = await takeSnapshot()
    // const eventLog = instance.allEvents()

    await instance.submitPreimage(
      solSha3('0x1000000000000000000000000000000000000000000000000000000000000000'),
      '0x1000000000000000000000000000000000000000000000000000000000000000'
    )

    t.shouldFail(instance.submitPreimage(
      solSha3('0x1000000000000000000000000000000000000000000000000000000000000000'),
      '0x2000000000000000000000000000000000000000000000000000000000000000'
    ))

    // const logs = await p(eventLog.get.bind(eventLog))()
    // console.log(logs)
    // eventLog.stopWatching()
    // await revertSnapshot(snapshot)
  })

  test('mintTokens', async t => {
    const snapshot = await takeSnapshot()

    await instance.mint(accounts[0], 120000)
    t.equal((await instance.balanceOf(accounts[0])).c[0], 120000)
    await revertSnapshot(snapshot)
  })

  // test('mintTokens2', async t => {
  //   console.log('start2')
  //   const snapshot = await takeSnapshot()

  //   // await instance.mint(accounts[0], 120000)
  //   t.equal((await instance.balanceOf(accounts[0])).c[0], 120000)
  //   await revertSnapshot(snapshot)
  //   console.log('finish2')
  // })

  test.only('newChannel', async t => {
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

  test('ectest', async t => {
    const eventLog = instance.allEvents()
    
    // await sleep(5)
    
    const privkey = '86de2cf259bf21a9aa2b8cf78f89ed479681001ca320c5762bb3237db65445cb'
    const addr = '0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d'
    const item = '0x1000000000000000000000000000000000000000000000000000000000000000'
    const hashed = web3.sha3(item, { encoding: 'hex' })

    const testRpcSig = web3.eth.sign(addr, hashed.slice(2))
    const ethutilsSig = sign(hashed, new Buffer(privkey, 'hex'))

    console.log('sigs', testRpcSig, ethutilsSig)

    console.log('addresses', addr, ecrecover(hashed, ethutilsSig))
    // ethutilsSig is correct

    await instance.sigTest(
      item,
      hashed,
      accounts[0],
      ethutilsSig
    )

    // await sleep(5)

    const logs = await p(eventLog.get.bind(eventLog))()

    console.log('logs', logs)
    eventLog.stopWatching()
  })
})

function sleep (time) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

function takeSnapshot() {
  return new Promise(async (accept) => {
    let res = await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_snapshot',
      id: new Date().getTime()
    })
    accept(res.result)
  })
}

function revertSnapshot (snapshotId) {
  return new Promise(async (accept) => {
    await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_revert',
      params: [snapshotId],
      id: new Date().getTime()
    })
    accept()
  })
}

function solSha3 (...args) {
    args = args.map(arg => {
        if (typeof arg === 'string') {
            if (arg.substring(0, 2) === '0x') {
                return arg.slice(2)
            } else {
                return web3.toHex(arg).slice(2)
            }
        }

        if (typeof arg === 'number') {
            return leftPad((arg).toString(16), 64, 0)
        }
    })

    args = args.join('')

    return web3.sha3(args, { encoding: 'hex' })
}

function sign (msgHash, privKey) {
  if (typeof msgHash === 'string' && msgHash.slice(0, 2) === '0x') {
    msgHash = Buffer.alloc(32, msgHash.slice(2), 'hex')
  }
  const sig = ethUtils.ecsign(msgHash, privKey)
  return `0x${sig.r.toString('hex')}${sig.s.toString('hex')}${sig.v.toString(16)}`
}

function ecrecover (msg, sig) {
  const r = ethUtils.toBuffer(sig.slice(0, 66))
  const s = ethUtils.toBuffer('0x' + sig.slice(66, 130))
  const v = 27 + parseInt(sig.slice(130, 132))
  const m = ethUtils.toBuffer(msg)
  const pub = ethUtils.ecrecover(m, v, r, s)
  return '0x' + ethUtils.pubToAddress(pub).toString('hex')
}

function filterLogs (logs) {
  return logs.map(log => [ log.event, log.args ])
}
