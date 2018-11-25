const { joinSignature } = require("ethers").utils
const {ethers} = require("ethers")

const {
  ACCT_A,
  ACCT_B,
} = require("./constants.js");

const provider = new ethers.providers.Web3Provider(web3.currentProvider);
const solSha3 = web3.utils.soliditySha3

module.exports = {
  provider,
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
  reDraw,
  finalAsserts
};

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

async function takeSnapshot() {
  return await provider.send(`evm_snapshot`)
}

async function revertSnapshot(snapshotId) {
  await provider.send(
    "evm_revert",
    [snapshotId]
  )
}

async function mineBlock() {
  await provider.send("evm_mine")
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
  expiration = false
) {

  if(!expiration) {
    expiration = await provider.getBlockNumber() + 5
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
  )

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

  const fingerprint = solSha3(
    "startSettlingPeriod", instance.address, channelId
  )

  return instance.startSettlingPeriod(
    channelId,
    sign(fingerprint, ACCT_A)
  )
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
  expiration = false
) {

  if(!expiration) {
    expiration = await provider.getBlockNumber() + 5
  }
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
  )

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

async function finalAsserts(
  {
    instance,
    channelId,
    addres0 = ACCT_A.address,
    addres1 = ACCT_B.address,
    totalBalance = "12",
    balance0 = "6",
    balance1 = "6",
    sequenceNumber = "0",
    settlingPeriodLength = "2",
    settlingPeriodStarted = false,
    settlingPeriodEnd = "0"
  }
) {
  let values = await instance.channels(channelId)
  assert.equal(addres0, values.address0, "Address 0 not equal")
  assert.equal(addres1, values.address1, "Address 1 not equal")
  assert.equal(
    totalBalance,
    values.totalBalance.toString(),
    "Total balance not equal"
  )
  assert.equal(balance0, values.balance0.toString(), "Balance 0 not equal")
  assert.equal(balance1, values.balance1.toString(), "Balance 1 not equal")
  assert.equal(
    sequenceNumber,
    values.sequenceNumber.toString(),
    "Sequence number not equal"
  )
  assert.equal(
    settlingPeriodLength,
    values.settlingPeriodLength.toString(),
    "Settling period length not equal"
  )
  assert.equal(
    settlingPeriodStarted,
    values.settlingPeriodStarted,
    "Settling period started not equal"
  )
  assert.equal(
    settlingPeriodEnd,
    values.settlingPeriodEnd.toString(),
    "Settling period end not equal"
  )
}
