// cook mango twist then skin sort option civil have still rather guilt

const test = require("blue-tape");
const p = require("util").promisify;

const {
  ACCT_0_PRIVKEY,
  ACCT_1_PRIVKEY,
  ACCT_0_ADDR,
  ACCT_1_ADDR,
  ACCT_2_PRIVKEY,
  ACCT_2_ADDR
} = require("./constants.js");

const {
  createChannel,
  solSha3,
  sign,
  takeSnapshot,
  revertSnapshot
} = require("./utils.js");

module.exports = async (test, instance) => {
  test("newChannel happy path", async t => {
    const snapshot = await takeSnapshot();
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
    await revertSnapshot(snapshot);
  });

  test("newChannel bad sig", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel derp";

    await t.shouldFail(createChannel(instance, string, channelId, 6, 6, 2));
    await revertSnapshot(snapshot);
  });

  test("newChannel bad amount", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await t.shouldFail(createChannel(instance, string, channelId, 6, 13, 2));
    await revertSnapshot(snapshot);
  });

  test("newChannel already exists", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await createChannel(instance, string, channelId, 6, 6, 2);

    await t.shouldFail(createChannel(instance, string, channelId, 6, 6, 2));
    await revertSnapshot(snapshot);
  });

  test("newChannel wrong private key", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await instance.mint(ACCT_0_ADDR, 12);
    await instance.mint(ACCT_1_ADDR, 12);

    const fingerprint = solSha3(
      string,
      channelId,
      ACCT_0_ADDR,
      ACCT_1_ADDR,
      6,
      6,
      2
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_2_PRIVKEY, "hex"));

    await t.shouldFail(
      instance.newChannel(
        channelId,
        ACCT_0_ADDR,
        ACCT_1_ADDR,
        6,
        6,
        2,
        signature0,
        signature1
      )
    );
    await revertSnapshot(snapshot);
  });

  test("newChannel wrong public key", async t => {
    const snapshot = await takeSnapshot();
    const channelId =
      "0x1000000000000000000000000000000000000000000000000000000000000000";
    const string = "newChannel";

    await instance.mint(ACCT_0_ADDR, 12);
    await instance.mint(ACCT_1_ADDR, 12);

    const fingerprint = solSha3(
      string,
      channelId,
      ACCT_0_ADDR,
      ACCT_1_ADDR,
      6,
      6,
      2
    );

    const signature0 = sign(fingerprint, new Buffer(ACCT_0_PRIVKEY, "hex"));
    const signature1 = sign(fingerprint, new Buffer(ACCT_1_PRIVKEY, "hex"));

    await t.shouldFail(
      instance.newChannel(
        channelId,
        ACCT_0_ADDR,
        ACCT_2_ADDR,
        6,
        6,
        2,
        signature0,
        signature1
      )
    );
    await revertSnapshot(snapshot);
  });
};
