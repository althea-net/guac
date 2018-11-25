const PaymentChannels = artifacts.require("PaymentChannels.sol")
const { throwing, reverting } = require("./helpers/shouldFail.js")
const {ACCT_A, ACCT_B} = require("./constants.js");

const {
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  mineBlocks,
  createChannel,
  updateState,
  startSettlingPeriod,
  closeChannel
} = require("./utils.js");

module.exports = context("Close Channel", () => {

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


  it("closeChannel happy path", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    assert.equal(
      (await instance.balanceOf.call(ACCT_A.address)).toString(),
      "11"
    );
    assert.equal(
      (await instance.balanceOf.call(ACCT_B.address)).toString(),
      "13"
    );
  });

  it("channel does not exist", async () => {
    const channelIdFake =
      "0x2000000000000000000000000000000000000000000000000000000000000000";

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await reverting(instance.closeChannel(channelIdFake));

    await instance.closeChannel(channelId);

  });

  it("channel is not settled", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);

    await reverting(instance.closeChannel(channelId));

    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

  });

  it("channel is already closed", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    await reverting(instance.closeChannel(channelId));

  });

  it("update after close", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);
    await startSettlingPeriod(instance, channelId);
    await mineBlocks(5);

    await instance.closeChannel(channelId);

    await reverting(updateState(instance, channelId, 1, 5, 7));

  });

  it("closeChannelFast happy path", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const fingerprint = solSha3(
      "closeChannelFast",
      instance.address,
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
      sign(fingerprint, ACCT_A),
      sign(fingerprint, ACCT_B)
    );

    assert.equal((await instance.balanceOf.call(ACCT_A.address)).toString(), "11");
    assert.equal((await instance.balanceOf.call(ACCT_B.address)).toString(), "13");

  });

  it("closeChannelFast nonexistant channel", async () => {
    const fingerprint = solSha3(
      "closeChannelFast",
      instance.address,
      "0x2000000000000000000000000000000000000000000000000000000000000000"
    );

    await reverting(
      instance.closeChannelFast(
        "0x2000000000000000000000000000000000000000000000000000000000000000",
        1,
        5,
        7,
        sign(fingerprint, ACCT_A),
        sign(fingerprint, ACCT_B)
      )
    );
  });

  it("closeChannelFast bad sig", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const fingerprint = solSha3(
      "closeChannelFast derp",
      instance.address,
      channelId,
      1,
      5,
      7
    );

    await reverting(
      instance.closeChannelFast(
        channelId,
        1,
        5,
        7,
        sign(fingerprint, ACCT_A),
        sign(fingerprint, ACCT_B)
      )
    );

  });

  it("closeChannelFast bad amount", async () => {

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const fingerprint = solSha3(
      "closeChannelFast",
      instance.address,
      channelId,
      1,
      500,
      7
    );

    await reverting(
      instance.closeChannelFast(
        channelId,
        1,
        500,
        7,
        sign(fingerprint, ACCT_A),
        sign(fingerprint, ACCT_B)
      )
    );
  })
})
