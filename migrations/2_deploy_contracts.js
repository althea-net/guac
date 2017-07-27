var ECVerify = artifacts.require("./ECVerify.sol");
// var MetaCoin = artifacts.require("./MetaCoin.sol");
var PaymentChannels = artifacts.require("./PaymentChannels.sol");

module.exports = function(deployer) {
    deployer.deploy(ECVerify);
    // deployer.link(ConvertLib, MetaCoin);
    //  deployer.deploy(MetaCoin);
    deployer.deploy(PaymentChannels);
};