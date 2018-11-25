const PaymentChannels = artifacts.require("PaymentChannels.sol")
const { throwing, reverting } = require("./helpers/shouldFail.js")
const {ACCT_A, ACCT_B, ACCT_C} = require("./constants.js");

const {
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  mineBlocks,
  createChannel,
  updateState,
  startSettlingPeriod,
  finalAsserts,
  provider,
} = require("./utils.js");

module.exports = context("Update State", async () => {

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

  it("updateState happy path", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);
    await finalAsserts({
      instance,
      channelId,
      balance0: "5",
      balance1: "7",
      sequenceNumber: "1",
    })
  })

  it("updateState bad amount", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await reverting(updateState(instance, channelId, 1, 5, 50));
    await updateState(instance, channelId, 1, 5, 7);
  });

  it("updateState nonexistant channel", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await updateState(instance, channelId, 1, 5, 7);

    await reverting(
      updateState(
        instance,
        "0x2000000000000000000000000000000000000000000000000000000000000000",
        1,
        5,
        7
      )
    );
  });

  it("channel closed before updateState", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await startSettlingPeriod(instance, channelId);
    await updateState(instance, channelId, 1, 5, 7);
    await mineBlocks(5);

    await reverting(updateState(instance, channelId, 2, 5, 7));
  });

  it("updateState low seq #", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 3, 5, 7);

    await reverting(updateState(instance, channelId, 2, 5, 7));
  });

  it("updateState bad fingerprint (string)", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);

    const fingerprint = solSha3(
      "updateState derp",
      instance.address,
      channelId,
      2,
      5,
      7
    );

    const signature0 = sign(fingerprint, ACCT_A);
    const signature1 = sign(fingerprint, ACCT_B);

    await reverting(
      instance.updateState(channelId, 2, 5, 7, signature0, signature1)
    );
  });

  it("updateState wrong private key", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const fingerprint = solSha3(
      "updateState",
      instance.address,
      channelId,
      1,
      5,
      7
    );

    const signature0 = sign(fingerprint, ACCT_A);
    const signature1 = sign(fingerprint, ACCT_C);

    await reverting(
      instance.updateState(channelId, 1, 5, 7, signature0, signature1)
    );
  });

  it("updateStateWithBounty happy path", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 1, 5, 7);
    const settlingTx = await startSettlingPeriod(instance, channelId);

    assert.equal(settlingTx.logs[0].event, "SettlingStarted");
    assert.equal(settlingTx.logs[0].args["_sequenceNumber"].toString(), "1");

    const sequenceNumber = 2;
    const balance0 = 4;
    const balance1 = 8;

    const updateStateFingerprint = solSha3(
      "updateState",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(updateStateFingerprint, ACCT_A);
    const signature1 = sign(updateStateFingerprint, ACCT_B);

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(bountyFingerprint, ACCT_A);

    await instance.updateStateWithBounty(
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2,
      bountySignature,
      { from: ACCT_C.address }
    );

    assert.equal(
      (await instance.balanceOf.call(ACCT_C.address)).toString(),
      "2"
    );
    
    await finalAsserts({
      instance,
      channelId,
      balance0: "4",
      balance1: "8",
      sequenceNumber: "2",
      settlingPeriodEnd: (await provider.getBlockNumber() + 1).toString(),
      settlingPeriodStarted: true,
    });
  });

  it("updateStateWithBounty settlingPeriod not started", async () => {
    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    const updateStateFingerprint = solSha3(
      "updateState",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(
      updateStateFingerprint,
      ACCT_A
    );
    const signature1 = sign(
      updateStateFingerprint,
      ACCT_B
    );

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(bountyFingerprint, ACCT_A);

    await reverting(
      instance.updateStateWithBounty(
        channelId,
        sequenceNumber,
        balance0,
        balance1,
        signature0,
        signature1,
        2,
        bountySignature,
        { from: ACCT_B.address }
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
      { from: ACCT_B.address}
    );
  });

  it("updateStateWithBounty bad sig", async () => {
    const sequenceNumber = 1;

    const balance0 = 5;
    const balance1 = 7;

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await startSettlingPeriod(instance, channelId);

    const updateStateFingerprint = solSha3(
      "updateState",
      channelId,
      sequenceNumber,
      balance0,
      balance1
    );

    const signature0 = sign(updateStateFingerprint, ACCT_A);
    const signature1 = sign(updateStateFingerprint, ACCT_B);

    const bountyFingerprint = solSha3(
      "updateStateWithBounty",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const bountySignature = sign(bountyFingerprint, ACCT_A);

    const badBountyFingerprint = solSha3(
      "updateStateWithBounty derp",
      instance.address,
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2
    );

    const badBountySignature = sign(badBountyFingerprint, ACCT_A);

    await throwing(
      instance.updateStateWithBounty(
        channelId,
        sequenceNumber,
        balance0,
        balance1,
        signature0,
        signature1,
        2,
        badBountySignature,
        { from: ACCT_C.address }
      )
    );

    /*
    await instance.updateStateWithBounty(
      channelId,
      sequenceNumber,
      balance0,
      balance1,
      signature0,
      signature1,
      2,
      bountySignature,
      { from: ACCT_C.address }
    );
    */
  });
})
