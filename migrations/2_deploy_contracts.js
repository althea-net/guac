var PaymentChannels = artifacts.require("../contracts/PaymentChannels.sol");

module.exports = function(deployer) {
  deployer.deploy(PaymentChannels);
};
