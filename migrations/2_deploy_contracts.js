var ConvertLib = artifacts.require("./ConvertLib.sol");
var MetaCoin = artifacts.require("./MetaCoin.sol");
var PaymentChannels = artifacts.require("PaymentChannels");

module.exports = function (deployer) {
  deployer.deploy(PaymentChannels);
};