const leftPad = require('left-pad')
const p = require('util').promisify
const ethUtils = require('ethereumjs-util')

module.exports = {
  sleep,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  ecrecover,
  filterLogs,
  mineBlocks
}

function sleep (time) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

let snapshotInc = 0

async function takeSnapshot() {
  let res = await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
    jsonrpc: '2.0',
    method: 'evm_snapshot',
    id: snapshotInc++
  })
  return res.result
}

async function revertSnapshot (snapshotId) {
  await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
    jsonrpc: '2.0',
    method: 'evm_revert',
    params: [snapshotId],
    id: snapshotInc++
  })
}

async function mineBlock () {
  await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: new Date().getTime()
  })
}

async function mineBlocks (count) {
  let i = 0
  while (i < count) {
    await mineBlock()
    i++
  }
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
