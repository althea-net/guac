const leftPad = require('left-pad')
const p = require('util').promisify
const ethUtils = require('ethereumjs-util')
const BN = require('bn.js')

const {
    ACCT_0_PRIVKEY,
    ACCT_0_ADDR,
    ACCT_1_PRIVKEY,
    ACCT_1_ADDR,
} = require('./constants.js')

module.exports = {
    sleep, // timeout
    takeSnapshot, // captures state blockchain, rewinds to previous state if needed
    revertSnapshot,
    solSha3,
    sign,
    ecrecover,
    filterLogs,
    mineBlocks, // mines multiple blocks
    createChannel,
    updateState,
    endChannel,
    toSolUint256,
    toSolInt256
}

function sleep(time) {
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

async function revertSnapshot(snapshotId) {
    await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [snapshotId],
        id: snapshotInc++
    })
}

async function mineBlock() {
    await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
    })
}

async function mineBlocks(count) {
    let i = 0
    while (i < count) {
        await mineBlock()
        i++
    }
}

function toSolUint256(num) { // deprecated
    return leftPad((num).toString(16), 64, 0)
}

function toSolInt256(num) { // BN big number library, takes incoming number, creates string for solidty 
    return new BN(num).toTwos(256).toString(16, 64)
}

function solSha3(...args) { // solsha3 - deprecated... sha3 takes bytes, hashes them 
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

function sign(msgHash, privKey) { // deprecated, takes three values, R-V-S, combines them into one
    if (typeof msgHash === 'string' && msgHash.slice(0, 2) === '0x') {
        msgHash = Buffer.alloc(32, msgHash.slice(2), 'hex')
    }
    const sig = ethUtils.ecsign(msgHash, privKey)
    return `0x${sig.r.toString('hex')}${sig.s.toString('hex')}${sig.v.toString(16)}`
}

function ecrecover(msg, sig) {
    const r = ethUtils.toBuffer(sig.slice(0, 66))
    const s = ethUtils.toBuffer('0x' + sig.slice(66, 130))
    const v = 27 + parseInt(sig.slice(130, 132))
    const m = ethUtils.toBuffer(msg)
    const pub = ethUtils.ecrecover(m, v, r, s)
    return '0x' + ethUtils.pubToAddress(pub).toString('hex')
}

function filterLogs(logs) {
    return logs.map(log => [log.event, log.args])
}


async function createChannel(
    instance,
    channelId,

    balance0,
    balance1,

    settlingPeriod
) {
    await instance.mint(ACCT_0_ADDR, 12) // minting coins into accounts
    await instance.mint(ACCT_1_ADDR, 12)

    const fingerprint = solSha3( // hashing values
        'newChannel',
        channelId,

        ACCT_0_ADDR,
        ACCT_1_ADDR,

        balance0,
        balance1,

        settlingPeriod
    )

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex')) // creates signature
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

    // await instance.newChannel(
    //     channelId,

    //     ACCT_0_ADDR,
    //     ACCT_1_ADDR,

    //     balance0,
    //     balance1,

    //     settlingPeriod,

    //     signature0,
    //     signature1
    // )
}

async function updateState(
    instance,
    channelId,
    sequenceNumber,
    balance0,
    balance1,
    hashlocks
) {
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
}

async function endChannel(instance, channelId) {
    const endChannelFingerprint = solSha3(
        'endChannel',
        channelId
    )

    await instance.endChannel(
        channelId,
        sign(endChannelFingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
    )
}