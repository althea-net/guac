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
  reDraw,
  mineBlocks,
  createChannel,
  updateState,
  startSettlingPeriod
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("reDraw happy path", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    // create channel with 6, 6 (both parties have 12 to start)
    await createChannel(instance, channelId, 6, 6, 2);

    t.equal((await instance.balanceOf.call(ACCT_0_ADDR)).c[0], 6);
    t.equal((await instance.balanceOf.call(ACCT_1_ADDR)).c[0], 6);

    // update channel to 5, 7, then 5, 1, effectively withdrawing 6 for address1,
    // bringing address1's balance to 12
    const tx = await reDraw(instance, channelId, 1, 5, 7, 5, 1);

    t.equal(tx.logs[0].event, "ChannelReDrawn");

    t.equal((await instance.balanceOf.call(ACCT_0_ADDR)).c[0], 6);
    t.equal((await instance.balanceOf.call(ACCT_1_ADDR)).c[0], 12);

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [channelId, ACCT_0_ADDR, ACCT_1_ADDR, "6", "5", "1", "1", "2", false, "0"]
    );

    await revertSnapshot(snapshot);
  });

  test("reDraw oldBalance higher than total", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await t.shouldFail(reDraw(instance, channelId, 1, 5, 50, 5, 1));

    await reDraw(instance, channelId, 1, 5, 7, 5, 1);

    await revertSnapshot(snapshot);
  });

  test("reDraw newBalance unaffordable", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await t.shouldFail(reDraw(instance, channelId, 1, 5, 7, 5, 100));

    await reDraw(instance, channelId, 1, 5, 7, 5, 1);

    await revertSnapshot(snapshot);
  });

  test("reDraw old sequence number", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await updateState(instance, channelId, 3, 5, 7);

    await t.shouldFail(reDraw(instance, channelId, 1, 5, 7, 5, 1));

    await reDraw(instance, channelId, 4, 5, 7, 5, 1);

    await revertSnapshot(snapshot);
  });

  test("reDraw expired tx", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await createChannel(instance, channelId, 6, 6, 2);

    await t.shouldFail(
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

    await revertSnapshot(snapshot);
  });

  test("reDraw nonexistant channel", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";

    await t.shouldFail(reDraw(instance, channelId, 1, 5, 7, 5, 1));

    await createChannel(instance, channelId, 6, 6, 2);

    await reDraw(instance, channelId, 1, 5, 7, 5, 1);

    await revertSnapshot(snapshot);
  });
};
