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
  startSettlingPeriod,
  toSolUint256,
  toSolInt256,
  closeChannel
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("closeChannel happy path no hashlocks", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await closeChannel(instance, channelId, "0x");

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), "13");

    await revertSnapshot(snapshot);
  });

  test("channel does not exist", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const channelIdFake =
      "0x2000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7, "0x");
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await t.shouldFail(instance.closeChannel(channelIdFake));

    await revertSnapshot(snapshot);
  });

  test("channel is not settled", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7, "0x");

    await t.shouldFail(instance.closeChannel(channelId));

    await revertSnapshot(snapshot);
  });

  test("channel is already closed", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await closeChannel(instance, channelId, "0x");

    await t.shouldFail(closeChannel(instance, channelId, "0x"));

    await revertSnapshot(snapshot);
  });

  test("hashlocks do not match", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await t.shouldFail(closeChannel(instance, channelId, "0x1"));

    await revertSnapshot(snapshot);
  });

  test("bad amount", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await t.shouldFail(closeChannel(instance, channelId, "0x", 5, 50));

    await revertSnapshot(snapshot);
  });

  test("closeChannel happy path with hashlocks (1 missing preimage)", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const preimage1 =
      "0x2000000000000000000000000000000000000000000000000000000000000000";
    const preimage2 =
      "0x3000000000000000000000000000000000000000000000000000000000000000";
    const preimage3 =
      "0x4000000000000000000000000000000000000000000000000000000000000000";

    await instance.submitPreimage(solSha3(preimage1), preimage1);
    await instance.submitPreimage(solSha3(preimage2), preimage2);

    // It doesn't matter if the adjustments in the hashlocks exceed the balances
    // in the channel individually as long as they add up to a totalAdjustment
    // that doesn't exceed the balances in the channel
    const hashlock1 = `${solSha3(preimage1).slice(2)}${toSolInt256(-10002)}`;
    const hashlock2 = `${solSha3(preimage2).slice(2)}${toSolInt256(10001)}`;
    const hashlock3 = `${solSha3(preimage3).slice(2)}${toSolInt256(2)}`;

    await closeChannel(
      instance,
      channelId,
      `0x${hashlock1}${hashlock2}${hashlock3}`
    );

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), "10");
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), "14");

    await revertSnapshot(snapshot);
  });

  test("closeChannel happy path with lots of hashlocks", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    let hashlocks = "0x";
    let preimages = "0x";
    let amount = 1;

    for (let i = 0; i < 100; i++) {
      const preimage = solSha3(i);

      preimages = preimages + solSha3(preimage).slice(2) + preimage.slice(2);
      hashlocks = hashlocks + preimage.slice(2) + toSolInt256(amount);

      amount = -amount;
    }

    await instance.submitPreimages(preimages);

    await mineBlocks(1);

    await closeChannel(instance, channelId, hashlocks);

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), "13");

    await revertSnapshot(snapshot);
  });

  test("closeChannelFast happy path no hashlocks", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    const fingerprint = solSha3("closeChannelFast", channelId, 1, 5, 7, "0x");

    await instance.closeChannelFast(
      channelId,
      1,
      5,
      7,
      "0x",
      sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
      sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
    );

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).toString(), "13");

    await revertSnapshot(snapshot);
  });

  test("closeChannelFast nonexistant channel", async t => {
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    const fingerprint = solSha3("closeChannelFast", channelId);

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        5,
        7,
        "0x",
        sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
        sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
      )
    );
  });

  test("closeChannelFast bad sig", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "closeChannelFast derp",
      channelId,
      1,
      5,
      7,
      "0x"
    );

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        5,
        7,
        "0x",
        sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
        sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
      )
    );

    await revertSnapshot(snapshot);
  });

  test("closeChannelFast bad amount", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    const fingerprint = solSha3("closeChannelFast", channelId, 1, 500, 7, "0x");

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        500,
        7,
        "0x",
        sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
        sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
      )
    );

    await revertSnapshot(snapshot);
  });
};
