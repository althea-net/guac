// cook mango twist then skin sort option civil have still rather guilt

const test = require("blue-tape");
const p = require("util").promisify;

const {
  ACCT_0_PRIVKEY,
  ACCT_1_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_ADDR
} = require("./constants.js");

const {
  createChannel,
  filterLogs,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("newChannel happy path", async t => {
    const snapshot = await takeSnapshot();
    const eventLog = instance.allEvents();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    t.equal((await instance.balanceOf(ACCT_0_ADDR)).c[0], 6);
    t.equal((await instance.balanceOf(ACCT_1_ADDR)).c[0], 6);

    t.deepEqual(
      JSON.parse(JSON.stringify(await instance.channels(channelId))),
      [
        "0x1000000000000000000000000000000000000000000000000000000000000000",

        "0xa09bd41a9f1d469fca7b3f82a579b855dd6b279d",
        "0x25e27882eeb2159ad3164ed2622241740dfe0528",

        false,
        false,

        "2",
        "0",

        "6",
        "6",
        "12",

        "0x",
        "0"
      ]
    );

    const logs = await p(eventLog.get.bind(eventLog))();
    console.log("logs", filterLogs(logs));
    eventLog.stopWatching();

    await revertSnapshot(snapshot);
  });

  test("newChannel bad sig", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel derp";

    t.shouldFail(createChannel(instance, string, channelId, 6, 6, 2));

    await revertSnapshot(snapshot);
  });

  test("newChannel bad amount", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    t.shouldFail(createChannel(instance, string, channelId, 6, 60, 2));

    await revertSnapshot(snapshot);
  });

  test("newChannel already exists", async t => {
    const snapshot = await takeSnapshot();

    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    createChannel(instance, string, channelId, 6, 6, 2);

    t.shouldFail(createChannel(instance, string, channelId, 6, 6, 2));

    await revertSnapshot(snapshot);
  });
};
