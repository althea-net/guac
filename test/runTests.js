const test = require("blue-tape");

const misc = require("./misc.js");
const newChannel = require("./newChannel.js");
const updateState = require("./updateState.js");
const endChannel = require("./endChannel.js");
const closeChannel = require("./closeChannel.js");
const PaymentChannels = artifacts.require("PaymentChannels");
(async () => {
  const instance = await PaymentChannels.deployed();
  newChannel(test, instance);
  updateState(test, instance);
  endChannel(test, instance);
  closeChannel(test, instance);
})();
