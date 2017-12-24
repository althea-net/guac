const test = require("blue-tape");

const newChannel = require("./newChannel.js");
const updateState = require("./updateState.js");
const startSettlingPeriod = require("./startSettlingPeriod.js");
const closeChannel = require("./closeChannel.js");
const PaymentChannels = artifacts.require("../contracts/PaymentChannels.sol");

(async () => {
  const instance = await PaymentChannels.deployed();
  newChannel(test, instance);
  updateState(test, instance);
  startSettlingPeriod(test, instance);
  closeChannel(test, instance);
})();
