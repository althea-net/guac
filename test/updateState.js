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
  endChannel
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("updateState happy path", async t => {
    const snapshot = await takeSnapshot();
    const eventLog = instance.allEvents();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await updateState(instance, channelId, 1, 5, 7, "0x");

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [
        channelId,

        "0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d",
        "0x25e27882eeb2159ad3164ed2622241740dfe0528",

        false,
        false,

        "2",
        "0",

        "5",
        "7",
        "12",

        "0x",
        "1"
      ]
    );

    const logs = await p(eventLog.get.bind(eventLog))();
    console.log("logs", filterLogs(logs));
    eventLog.stopWatching();

    await revertSnapshot(snapshot);
  });

  test("updateState nonexistant channel", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    t.shouldFail(
      updateState(
        instance,
        "0x2000000000000000000000000000000000000000000000000000000000000000",
        1,
        5,
        7,
        "0x"
      )
    );

    await revertSnapshot(snapshot);
  });

  test("updateState ended but not settled", async t => {
    const snapshot = await takeSnapshot();
    await updateStateEnded(t, 0);
    await revertSnapshot(snapshot);
  });

  test("updateState settled channel", async t => {
    const snapshot = await takeSnapshot();
    t.shouldFail(updateStateEnded(t, 5));
    await revertSnapshot(snapshot);
  });

  async function updateStateEnded(t, blocksMined) {
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await endChannel(instance, channelId);

    if (blocksMined) {
      await mineBlocks(blocksMined);
    }

    await updateState(instance, channelId, 1, 5, 7, "0x");
  }

  test("updateState low seq", async t => {
    const snapshot = await takeSnapshot();

    await createChannel(instance);

    await updateState(
      instance,
      "0x1000000000000000000000000000000000000000000000000000000000000000",
      3,
      5,
      7,
      "0x"
    );

    t.shouldFail(
      updateState(
        instance,
        "0x1000000000000000000000000000000000000000000000000000000000000000",
        3,
        5,
        7,
        "0x"
      )
    );

    await revertSnapshot(snapshot);
  });

  test("updateState wrong balances", async t => {
    const snapshot = await takeSnapshot();

    await createChannel(instance);

    t.shouldFail(
      updateState(
        instance,
        "0x1000000000000000000000000000000000000000000000000000000000000000",
        3,
        5000000,
        7,
        "0x"
      )
    );

    await revertSnapshot(snapshot);
  });

  test("updateState bad sig", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance);

    const fingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"));

    t.shouldFail(
      instance.updateState(
        channelId,
        sequenceNumber,
        balance0,
        balance1,
        hashlocks,
        signature0,
        signature1
      )
    );

    await revertSnapshot(snapshot);
  });
};
