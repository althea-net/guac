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
  test("closeChannel happy path", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    t.equal((await instance.balanceOf.call(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf.call(ACCT_1_ADDR)).toString(), "13");

    await revertSnapshot(snapshot);
  });

  test("channel does not exist", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const channelIdFake =
      "0x2000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await t.shouldFail(instance.closeChannel(channelIdFake));

    await instance.closeChannel(channelId);

    await revertSnapshot(snapshot);
  });

  test("channel is not settled", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);

    await t.shouldFail(instance.closeChannel(channelId));

    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    await revertSnapshot(snapshot);
  });

  test("channel is already closed", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    await t.shouldFail(instance.closeChannel(channelId));

    await revertSnapshot(snapshot);
  });

  test("update after close", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);
    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    await t.shouldFail(updateState(instance, channelId, 1, 5, 7));

    await revertSnapshot(snapshot);
  });

  test("closeChannelFast happy path", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    const fingerprint = solSha3(
      "closeChannelFast",
      instance.contract.address,
      channelId,
      1,
      5,
      7
    );

    await instance.closeChannelFast(
      channelId,
      1,
      5,
      7,
      sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
      sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
    );

    t.equal((await instance.balanceOf.call(ACCT_0_ADDR)).toString(), "11");
    t.equal((await instance.balanceOf.call(ACCT_1_ADDR)).toString(), "13");

    await revertSnapshot(snapshot);
  });

  test("closeChannelFast nonexistant channel", async t => {
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    const fingerprint = solSha3(
      "closeChannelFast",
      instance.contract.address,
      channelId
    );

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        5,
        7,
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
      instance.contract.address,
      channelId,
      1,
      5,
      7
    );

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        5,
        7,
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

    const fingerprint = solSha3(
      "closeChannelFast",
      instance.contract.address,
      channelId,
      1,
      500,
      7
    );

    await t.shouldFail(
      instance.closeChannelFast(
        channelId,
        1,
        500,
        7,
        sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex")),
        sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"))
      )
    );

    await revertSnapshot(snapshot);
  });
};
