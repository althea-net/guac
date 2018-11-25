const PaymentChannels = artifacts.require("PaymentChannels.sol")
const {reverting } = require("./helpers/shouldFail.js")
const {ACCT_A, ACCT_B} = require("./constants.js");

const {
  takeSnapshot,
  revertSnapshot,
  reDraw,
  createChannel,
  updateState,
	finalAsserts,
} = require("./utils.js");

module.exports = context("Redraw", async () => {
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

  it("reDraw happy path", async () => {

    // create channel with 6, 6 (both parties have 12 to start)
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    assert.equal((await instance.balanceOf.call(ACCT_A.address)).c[0], 6);
    assert.equal((await instance.balanceOf.call(ACCT_B.address)).c[0], 6);

    // update channel to 5, 7, then 5, 1,
		// effectively withdrawing 6 for address1,
    // bringing address1's balance to 12
    const redrawTx = await reDraw(instance, channelId, 1, 5, 7, 5, 1);

    assert.equal(redrawTx.logs[0].event, "ChannelReDrawn");
    assert.equal((await instance.balanceOf.call(ACCT_A.address)).c[0], 6);
    assert.equal((await instance.balanceOf.call(ACCT_B.address)).c[0], 12);
	
		finalAsserts({
			instance,
			channelId,
			totalBalance: "6",
			balance0: "5",
			balance1: "1",
			sequenceNumber: "1",
		})
  });

  it("reDraw oldBalance higher than total", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await reverting(reDraw(instance, channelId, 1, 5, 50, 5, 1));
    await reDraw(instance, channelId, 1, 5, 7, 5, 1);
  });

  it("reDraw newBalance unaffordable", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await reverting(reDraw(instance, channelId, 1, 5, 7, 5, 100));
    await reDraw(instance, channelId, 1, 5, 7, 5, 1);
  });

  it("reDraw old sequence number", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await updateState(instance, channelId, 3, 5, 7);
    await reverting(reDraw(instance, channelId, 1, 5, 7, 5, 1));
    await reDraw(instance, channelId, 4, 5, 7, 5, 1);
  });

  it("reDraw expired tx", async () => {
    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;

    await reverting(
      reDraw(
        instance,
        channelId,
        1,
        5,
        7,
        5,
        1,
        web3.eth.getBlock("latest").number
      )
    );

    await reDraw(instance, channelId, 1, 5, 7, 5, 1);
  });

  it("reDraw nonexistant channel", async () => {
    await reverting(
      reDraw(
        instance,
        "0x1000000000000000000000000000000000000000000000000000000000000000",
				1,
        5,
        7,
        5,
        1
      )
    );

    const tx = await createChannel(instance, 6, 6, 2);
    const channelId = tx.logs[0].args._channelId;
    await reDraw(instance, channelId, 1, 5, 7, 5, 1);
  });
})
