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
  startSettlingPeriod
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("updateState happy path", async t => {
    const snapshot = await takeSnapshot();
    const eventLog = instance.allEvents();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await updateState(instance, channelId, 1, 5, 7);

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [
        channelId,
        ACCT_0_ADDR,
        ACCT_1_ADDR,
        "12",
        "5",
        "7",
        "1",
        "2",
        false,
        "0",
        false
      ]
    );

    await revertSnapshot(snapshot);
  });

  test("updateState nonexistant channel", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await updateState(
      instance,
      "0x1000000000000000000000000000000000000000000000000000000000000000",
      1,
      5,
      7
    );

    await t.shouldFail(
      updateState(
        instance,
        "0x2000000000000000000000000000000000000000000000000000000000000000",
        1,
        5,
        7
      )
    );

    await revertSnapshot(snapshot);
  });

  test("channel closed before updateState", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await startSettlingPeriod(instance, channelId);
    await updateState(instance, channelId, 1, 5, 7);
    await mineBlocks(5);

    await t.shouldFail(updateState(instance, channelId, 2, 5, 7));

    await revertSnapshot(snapshot);
  });

  test("updateState low seq #", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 3, 5, 7);

    await t.shouldFail(updateState(instance, channelId, 2, 5, 7));

    await revertSnapshot(snapshot);
  });

  test("updateState bad fingerprint (string)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);

    const fingerprint = solSha3(
      "updateState derp",
      instance.contract.address,
      channelId,
      2,
      5,
      7
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"));

    await t.shouldFail(
      instance.updateState(channelId, 2, 5, 7, signature0, signature1)
    );

    await revertSnapshot(snapshot);
  });

  test("updateState wrong private key", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "updateState",
      instance.contract.address,
      channelId,
      1,
      5,
      7
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_2_PRIVKEY, "hex"));

    await t.shouldFail(
      instance.updateState(channelId, 1, 5, 7, signature0, signature1)
    );

    await revertSnapshot(snapshot);
  });

  test("updateStateWithBounty happy path", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await updateState(instance, channelId, 1, 5, 7);

    const tx = await startSettlingPeriod(instance, channelId);

    t.equal(tx.logs[0].event, "SettlingStarted");
    t.equal(tx.logs[0].args["_sequenceNumber"].toString(), "1");

    const sequenceNumber = 2;
    const balance0 = 4;
    const balance1 = 8;

    const updateStateFingerprint = solSha3(
      "updateState",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );
    const signature1 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_1_PRIVKEY, "hex")
    );

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(
      bountyFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );

    await instance.updateStateWithBounty(
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2,
      bountySignature,
      { from: ACCT_2_ADDR }
    );

    t.equal((await instance.balanceOf.call(ACCT_2_ADDR)).toString(), "2");

    const channel = JSON.parse(
      JSON.stringify(await instance.channels(channelId))
    );

    t.deepEqual(channel, [
      channelId,
      ACCT_0_ADDR,
      ACCT_1_ADDR,
      "12",
      "4",
      "8",
      "2",
      "2",
      true,
      channel[9],
      false
    ]);

    await revertSnapshot(snapshot);
  });

  test("updateStateWithBounty settlingPeriod not started", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    await createChannel(instance, channelId, 6, 6, 2);

    const updateStateFingerprint = solSha3(
      "updateState",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );
    const signature1 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_1_PRIVKEY, "hex")
    );

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(
      bountyFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );

    await t.shouldFail(
      instance.updateStateWithBounty(
        channelId,
        sequenceNumber,
        balance0,
        balance1,
        signature0,
        signature1,
        2,
        bountySignature,
        { from: ACCT_2_ADDR }
      )
    );

    await startSettlingPeriod(instance, channelId);

    await instance.updateStateWithBounty(
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2,
      bountySignature,
      { from: ACCT_2_ADDR }
    );

    await revertSnapshot(snapshot);
  });

  test("updateStateWithBounty bad sig", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    await createChannel(instance, channelId, 6, 6, 2);

    await startSettlingPeriod(instance, channelId);

    const updateStateFingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );
    const signature1 = sign(
      updateStateFingerprint,
      new Buffer(ACCT_1_PRIVKEY, "hex")
    );

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(
      bountyFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );

    const badBountyFingerprint = solSha3(
      "updateStateWithBounty derp",
      instance.contract.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const badBountySignature = sign(
      badBountyFingerprint,
      new Buffer(ACCT_0_PRIVKEY, "hex")
    );

    await t.shouldFail(
      instance.updateStateWithBounty(
        channelId,
        sequenceNumber,
        balance0,
        balance1,
        signature0,
        signature1,
        2,
        badBountySignature,
        { from: ACCT_2_ADDR }
      )
    );

    // await instance.updateStateWithBounty(
    //   channelId,
    //   sequenceNumber,
    //   balance0,
    //   balance1,
    //   signature0,
    //   signature1,
    //   2,
    //   bountySignature,
    //   { from: ACCT_2_ADDR }
    // );

    await revertSnapshot(snapshot);
  });
};
