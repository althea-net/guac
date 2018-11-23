const p = require("util").promisify;
const { joinSignature } = require("ethers").utils

const solSha3 = web3.utils.soliditySha3

const {
  ACCT_A,
  ACCT_B,
  ACCT_C,
} = require("./constants.js");

module.exports = {
  sleep,
  takeSnapshot,
  revertSnapshot,
  solSha3,
  sign,
  filterLogs,
  mineBlocks,
  createChannel,
  updateState,
  startSettlingPeriod,
  closeChannel,
  reDraw
};

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

let snapshotInc = 0;

async function takeSnapshot() {
  //eslint-disable-next-line
  const {error, result} = await p(web3.currentProvider.send)({
    jsonrpc: "2.0",
    method: "evm_snapshot",
    id: snapshotInc++
  })
  return result
}

async function revertSnapshot(snapshotId) {
  await p(web3.currentProvider.send)({
    jsonrpc: "2.0",
    method: "evm_revert",
    params: [snapshotId],
    id: snapshotInc++
  })
}


async function mineBlock() {
  await p(web3.currentProvider.sendAsync.bind(web3.currentProvider))({
    jsonrpc: "2.0",
    method: "evm_mine",
    id: new Date().getTime()
  });
}

async function mineBlocks(count) {
  let i = 0;
  while (i < count) {
    await mineBlock();
    i++;
  }
}

function sign(fingerprint, signer) {
  return joinSignature(signer.signDigest(fingerprint))
}

function filterLogs(logs) {
  return logs.map(log => [log.event, log.args]);
}

async function createChannel(
  instance,
  // channelId,
  balance0,
  balance1,
  settlingPeriod,
  string = "newChannel",
  expiration = null
) {

  if(!expiration) {
    expiration = (await web3.eth.getBlock("latest")).number + 5
  }
  await instance.depositToAddress(ACCT_A.address, { value: 12 });
  await instance.depositToAddress(ACCT_B.address, { value: 12 });

  const fingerprint = solSha3(
    string,
    instance.address,
    ACCT_A.address,
    ACCT_B.address,
    balance0,
    balance1,
    expiration,
    settlingPeriod
  );

  const signature0 = sign(fingerprint, ACCT_A);
  const signature1 = sign(fingerprint, ACCT_B);

  return instance.newChannel(
    ACCT_A.address,
    ACCT_B.address,
    balance0,
    balance1,
    expiration,
    settlingPeriod,
    signature0,
    signature1
  );
}

async function updateState(
  instance,
  channelId,
  sequenceNumber,
  balance0,
  balance1
) {
  const fingerprint = solSha3(
    "updateState",
    instance.address,
    channelId,
    sequenceNumber,
    balance0,
    balance1
  );

  const signature0 = sign(fingerprint, ACCT_A);
  const signature1 = sign(fingerprint, ACCT_B);

  await instance.updateState(
    channelId,
    sequenceNumber,
    balance0,
    balance1,
    signature0,
    signature1
  );
}

async function startSettlingPeriod(instance, channelId) {
  const startSettlingPeriodFingerprint = solSha3(
    "startSettlingPeriod",
    instance.address,
    channelId
  );

  return instance.startSettlingPeriod(
    channelId,
    sign(startSettlingPeriodFingerprint, ACCT_A)
  );
}

async function closeChannel(instance, channelId, balance0 = 5, balance1 = 7) {
  await createChannel(instance, channelId, 6, 6, 2);
  await updateState(instance, channelId, 1, balance0, balance1);
  await startSettlingPeriod(instance, channelId);
  await mineBlocks(5);
  await instance.closeChannel(channelId);
}

async function reDraw(
  instance,
  channelId,
  sequenceNumber,
  oldBalance0,
  oldBalance1,
  newBalance0,
  newBalance1,
  expiration = web3.eth.getBlock("latest").number + 5
) {
  const fingerprint = solSha3(
    "reDraw",
    instance.address,
    channelId,
    sequenceNumber,
    oldBalance0,
    oldBalance1,
    newBalance0,
    newBalance1,
    expiration
  );

  const signature0 = sign(fingerprint, ACCT_A);
  const signature1 = sign(fingerprint, ACCT_B);

  return instance.reDraw(
    channelId,
    sequenceNumber,
    oldBalance0,
    oldBalance1,
    newBalance0,
    newBalance1,
    expiration,
    signature0,
    signature1
  );
}
