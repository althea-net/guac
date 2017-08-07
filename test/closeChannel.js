// cook mango twist then skin sort option civil have still rather guilt

const test = require("blue-tape");
const p = require("util").promisify;

const {
  ACCT_0_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_PRIVKEY,
  ACCT_1_ADDR
} = require("./constants.js");

const {
  filterLogs,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  mineBlocks,
  createChannel,
  updateState,
  endChannel,
  toSolUint256,
  toSolInt256,
  closeChannel
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("closeChannel happy path no hashlocks", async t => {
    const snapshot = await takeSnapshot();
    const eventLog = instance.allEvents();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await closeChannel(instance, string, channelId, "0x");

    web3.eth.getBlock("latest", (err, block) => {
      console.log("dododododo", err, block);
    });

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), "13");

    const logs = await p(eventLog.get.bind(eventLog))();
    console.log(
      "logs",
      filterLogs(logs).map(log => {
        return Object.entries(log[1]).reduce((acc, [key, val]) => {
          acc[key] = val && val.toString();
          return acc;
        });
      })
    );
    eventLog.stopWatching();

    await revertSnapshot(snapshot);
  });

  //incomplete
  test.only("channel does not exist", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const channelIdFake =
      "0x2000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    await updateState(instance, channelId, 1, 5, 7, "0x");

    await endChannel(instance, channelId);

    await mineBlocks(5);

    t.shouldFail(instance.closeChannel(channelIdFake));

    await revertSnapshot(snapshot);
  });

  test("channel is not settled", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    await updateState(instance, channelId, 1, 5, 7, "0x");

    // await endChannel(instance, channelId);

    // await mineBlocks(5);

    t.shouldFail(instance.closeChannel(channelId));

    await revertSnapshot(snapshot);
  });

  test("channel is already closed", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await closeChannel(instance, string, channelId, "0x");

    t.shouldFail(closeChannel(instance, string, channelId, "0x"));

    await revertSnapshot(snapshot);
  });

  test("hashlocks do not match", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    t.shouldFail(closeChannel(instance, string, channelId, "0x1"));

    await revertSnapshot(snapshot);
  });

  /* Not being used for the time being

        test('closeChannel happy path with hashlocks', async t => {
            const snapshot = await takeSnapshot()
            const eventLog = instance.allEvents()

            const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
            const preimage1 = '0x2000000000000000000000000000000000000000000000000000000000000000'
            const preimage2 = '0x3000000000000000000000000000000000000000000000000000000000000000'

            const string = 'newChannel'

            await instance.submitPreimage(solSha3(preimage1), preimage1)
            await instance.submitPreimage(solSha3(preimage2), preimage2)

            await closeChannel(
                instance,
                string,
                channelId,
                `0x${solSha3(preimage1).slice(2)}${toSolInt256(-14)}${solSha3(preimage2).slice(2)}${toSolInt256(13)}`
            )

            web3.eth.getBlock('latest', (err, block) => {
                console.log("dododododo", err, block)
            })

            t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), '10')
            t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), '14')

            const logs = await p(eventLog.get.bind(eventLog))()
            console.log('logs', filterLogs(logs).map(log => {
                return Object.entries(log[1]).reduce((acc, [key, val]) => {
                    acc[key] = val && val.toString()
                    return acc
                })
            }))
            eventLog.stopWatching()

            await revertSnapshot(snapshot)
        })

        test('closeChannel happy path with lots of hashlocks', async t => {
            const snapshot = await takeSnapshot()
            const eventLog = instance.allEvents()

            const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
            const string = 'newChannel'

            let hashlocks = '0x'
            let preimages = '0x'
            let amount = 1

            for (let i = 0; i < 100; i++) {
                const preimage = solSha3(i);

                preimages = preimages + solSha3(preimage).slice(2) + preimage.slice(2)
                hashlocks = hashlocks + preimage.slice(2) + toSolInt256(amount)

                amount = -amount
            }

            await instance.submitPreimages(preimages)

            web3.eth.getBlock('latest', (err, block) => {
                console.log('submitPreimages', err, block)
            })

            await mineBlocks(1)

            await closeChannel(
                instance,
                string,
                channelId,
                hashlocks
            )

            web3.eth.getBlock('latest', (err, block) => {
                console.log('closeChannel', err, block)
            })

            t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), '11')
            t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), '13')

            const logs = await p(eventLog.get.bind(eventLog))()
            console.log('logs', filterLogs(logs).map(log => {
                return Object.entries(log[1]).reduce((acc, [key, val]) => {
                    acc[key] = val && val.toString()
                    return acc
                })
            }))
            eventLog.stopWatching()

            await revertSnapshot(snapshot)
        })*/
};
