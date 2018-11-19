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
  // startSettlingPeriod happy path is tested in updateState.js
  test("startSettlingPeriod nonexistant channel", async t => {
    const snapshot = await takeSnapshot();

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);

    await t.shouldFail(
      startSettlingPeriod(
        instance,
        "0x2000000000000000000000000000000000000000000000000000000000000000"
      )
    );

    await revertSnapshot(snapshot);
  });

  test("startSettlingPeriod already started", async t => {
    const snapshot = await takeSnapshot();

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);

    await startSettlingPeriod(instance, channelId);

    await t.shouldFail(startSettlingPeriod(instance, channelId));

    await revertSnapshot(snapshot);
  });

  test("startSettlingPeriod bad sig", async t => {
    const snapshot = await takeSnapshot();

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const startSettlingPeriodFingerprint = solSha3(
      "startSettlingPeriod derp",
      instance.contract.address,
      channelId
    );

    await updateState(instance, channelId, 1, 5, 7);

    await t.shouldFail(
      instance.startSettlingPeriod(
        channelId,
        sign(startSettlingPeriodFingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"))
      )
    );

    await revertSnapshot(snapshot);
  });
};
