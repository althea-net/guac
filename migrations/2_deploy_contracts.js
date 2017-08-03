var PaymentChannels = artifacts.require("PaymentChannels");

module.exports = function(deployer) {
  deployer.deploy(PaymentChannels);
};
