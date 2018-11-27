const PaymentChannels = artifacts.require("PaymentChannels.sol")
const {reverting } = require("./helpers/shouldFail.js")
const {ACCT_A} = require("./constants.js");

const {
  revertSnapshot,
  takeSnapshot,
  solSha3,
  sign,
  createChannel,
  updateState,
  startSettlingPeriod
} = require("./utils.js");

module.exports = context("Start settling period", async () => {

  let instance, snapshotId
  before(async () => {
    instance = await PaymentChannels.new()
  })
  beforeEach(async () => {
    snapshotId = await takeSnapshot()
  })
  afterEach(async () => {
    await revertSnapshot(snapshotId)
  })
  // startSettlingPeriod happy path is tested in updateState.js
  it("startSettlingPeriod nonexistant channel", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);
    await reverting(
      startSettlingPeriod(
        instance,
        "0x2000000000000000000000000000000000000000000000000000000000000000"
      )
    );
  });

  it("startSettlingPeriod already started", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await reverting(startSettlingPeriod(instance, channelId));
  });

  it("startSettlingPeriod bad sig", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const startSettlingPeriodFingerprint = solSha3(
      "startSettlingPeriod derp",
      instance.address,
      channelId
    );

    await updateState(instance, channelId, 1, 5, 7);
    await reverting(
      instance.startSettlingPeriod(
        channelId,
        sign(startSettlingPeriodFingerprint, ACCT_A)
      )
    );
  });
})
