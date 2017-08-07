// cook mango twist then skin sort option civil have still rather guilt

//TODO
// CS: Finish 'updateState ended but not settled' 
// Look into 'updateState ended and settled channel', test does not throw
// Look into 'updateState low seq #', test does not throw

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

module.exports = async(test, instance) => {

    test('updateState happy path', async t => {
        const snapshot = await takeSnapshot()
        const eventLog = instance.allEvents()

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

        t.deepEqual(
            JSON.parse(JSON.stringify(await instance.channels(channelId))), [channelId,

                '0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d',
                '0x25e27882eeb2159ad3164ed2622241740dfe0528',

                false, false,

                '2', '0',

                '5', '7', '12',

                '0x', '1'
            ]
        )

        const logs = await p(eventLog.get.bind(eventLog))()
        console.log('logs', filterLogs(logs))
        eventLog.stopWatching()

        await revertSnapshot(snapshot)
    })


    /* tests channelExists function by mismatching channelID */
    test('updateState nonexistant channel', async t => {
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

        t.shouldFail(updateState(
            instance,
            '0x2000000000000000000000000000000000000000000000000000000000000000',

            1,
            5,
            7,

            '0x'
        ))

        await revertSnapshot(snapshot)
    })


    /* defines updateStateEnabled function which is used to test channelIsNotSettled 
     function by ending the channel and mining x# of blocks */
    async function updateStateEnded(t, blocksMined) {
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

        await endChannel(instance, channelId) // moved after updateState, test does not throw, needs to be investigated

        if (blocksMined) {
            await mineBlocks(blocksMined)
        }

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

            '0x'
        )


    }

    //not complete? 
    // test.only('updateState ended but not settled', async t => {
    //     const snapshot = await takeSnapshot()
    //     t.shouldFail(updateStateEnded(t, 0)) //wont fail if mined blocks are not greater than 0?
    //     await revertSnapshot(snapshot)
    // })


    /* tests channelIsNotSettled function, by ending the channel before updatestate is invoked
    ,hence channel ended and settling block have both happend*/
    test('updateState ended and settled channel', async t => {
        const snapshot = await takeSnapshot()
        t.shouldFail(updateStateEnded(t, 5)) // block.number = 5, greater than settling block,
        await revertSnapshot(snapshot)
    })


    async function updateStateSettled(t, blocksMined) {
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

        if (blocksMined) {
            await mineBlocks(blocksMined)
        }

        await updateState(
            instance,
            channelId,
            1,

            5,
            7,

            '0x'
        )

        await endChannel(instance, channelId)

    }

    // not complete...
    test.only('updateState not ended but settled', async t => {
        const snapshot = await takeSnapshot()
        t.shouldFail(updateStateSettled(t, 1)) // if settledBlock is set to 0 in PC contract this should always fail since the current block # in testRPC will exceed 0 after launch?
        await revertSnapshot(snapshot)
    })


    // how is this passing if the sequencenumber = 3 and channel.sequencenumber = 0?
    test('updateState low seq #', async t => {
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
            3,

            5,
            7,

            '0x'
        )

        t.shouldFail(updateState(
            instance,
            channelId,
            3,

            5,
            7,

            '0x'
        ))

        await revertSnapshot(snapshot)
    })


    /* tests balancesEqualTotal function by checking that the sum of account 1 
    and 2 must are equal to the total balance*/
    test('updateState wrong balances', async t => {
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

        t.shouldFail(updateState(
            instance,
            channelId,

            1,

            7,
            6,

            '0x'
        ))

        await revertSnapshot(snapshot)
    })


    /* tests signedByBoth function by using the same signature twice*/
    test('updateState bad sig', async t => {
        const snapshot = await takeSnapshot()

        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const string = 'newChannel'

        const sequenceNumber = 1

        const balance0 = 5
        const balance1 = 7

        const hashlocks = '0x'

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        const fingerprint = solSha3(
            'updateState',
            channelId,
            sequenceNumber,
            balance0,
            balance1,
            hashlocks
        )

        const signature0 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex')) // causes failure
        const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

        t.shouldFail(instance.updateState(
            channelId,
            sequenceNumber,

            balance0,
            balance1,

            hashlocks,

            signature0,
            signature1
        ))

        await revertSnapshot(snapshot)
    })


    /* tests signedByBoth function by forcing mismatch of fingerprint*/
    test('updateState bad sig', async t => {
        const snapshot = await takeSnapshot()

        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const string = 'newChannel'

        const sequenceNumber = 1

        const balance0 = 5
        const balance1 = 7

        const hashlocks = '0x'

        await createChannel(
            instance,
            string,
            channelId,

            6,
            6,

            2
        )

        const fingerprint = solSha3(
            'updateState derp', // causes failure
            channelId,
            sequenceNumber,
            balance0,
            balance1,
            hashlocks
        )

        const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, 'hex'))
        const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, 'hex'))

        t.shouldFail(instance.updateState(
            channelId,
            sequenceNumber,

            balance0,
            balance1,

            hashlocks,

            signature0,
            signature1
        ))

        await revertSnapshot(snapshot)
    })
}