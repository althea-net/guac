// cook mango twist then skin sort option civil have still rather guilt

const test = require('blue-tape')
const p = require('util').promisify

const {
    ACCT_0_PRIVKEY,
    ACCT_0_ADDR,
    ACCT_1_PRIVKEY,
    ACCT_1_ADDR,
    ACCT_2_PRIVKEY,
    ACCT_2_ADDR,
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

module.exports = async(test, instance) => {
    // endChannel happy path is tested in updateState.js
    test('endChannel nonexistant channel', async t => {
        const snapshot = await takeSnapshot()

        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const string = 'newChannel'

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

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
        const string = 'newChannel'

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

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

    test('endChannel bad sig', async t => {
        const snapshot = await takeSnapshot()

        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const string = 'newChannel'

        const endChannelFingerprint = solSha3(
            'endChannel derp',
            channelId
        )

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

            '0x'
        )

        t.shouldFail(instance.endChannel(
            channelId,
            sign(endChannelFingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
        ))

        await revertSnapshot(snapshot)
    })


    test('endChannel fake private key', async t => {
        const snapshot = await takeSnapshot()

        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const string = 'newChannel'

        const endChannelFingerprint = solSha3(
            'endChannel',
            channelId
        )

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

            '0x'
        )

        t.shouldFail(instance.endChannel(
            channelId,
            sign(endChannelFingerprint, new Buffer(ACCT_2_PRIVKEY, 'hex'))
        ))

        await revertSnapshot(snapshot)
    })
}