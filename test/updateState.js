// cook mango twist then skin sort option civil have still rather guilt

const test = require("blue-tape");
const p = require("util").promisify;

const {
  ACCT_0_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_PRIVKEY,
  ACCT_1_ADDR,
  ACCT_2_PRIVKEY,
  ACCT_2_ADDR
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
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

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
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

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

  test("endChannel before updateState", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);
    await endChannel(instance, channelId);
    await mineBlocks(5);

    t.shouldFail(updateState(instance, channelId, 1, 5, 7, "0x"));

    // await updateState(instance, channelId, 1, 5, 7, "0x");
    // t.shouldFail(endChannel(instance, channelId));

    await revertSnapshot(snapshot);
  });

  test("updateState low seq #", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);
    await updateState(instance, channelId, 3, 5, 7, "0x");

    t.shouldFail(updateState(instance, channelId, 2, 5, 7, "0x"));

    await revertSnapshot(snapshot);
  });

  test("updateState exceeds total balance", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    t.shouldFail(updateState(instance, channelId, 1, 7, 6, "0x"));

    await revertSnapshot(snapshot);
  });

  test("updateState below total balance", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    t.shouldFail(updateState(instance, channelId, 1, 6, 5, "0x"));

    await revertSnapshot(snapshot);
  });

  test("updateState bad fingerprint (string)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState derp",
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
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

  test("updateState bad fingerprint (channelID)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      "0x2000000000000000000000000000000000000000000000000000000000000000",
      sequenceNumber,
      balance0,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
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

  test("updateState bad fingerprint (sequenceNumber)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      channelId,
      2,
      balance0,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
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

  test("updateState bad fingerprint (balance)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      4,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
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

  test("updateState bad fingerprint (hashlocks)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      "0x1"
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
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

  test("private key used twice", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

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

  test("updateState wrong private key", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const hashlocks = "0x";

    await createChannel(instance, string, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      hashlocks
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_2_PRIVKEY, "hex"));

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
