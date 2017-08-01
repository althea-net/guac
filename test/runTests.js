const test = require('blue-tape')

const misc = require('./misc.js')
const newChannel = require('./newChannel.js')
const updateState = require('./updateState.js')
const endChannel = require('./endChannel.js')
const closeChannel = require('./closeChannel.js')
const PaymentChannels = artifacts.require('PaymentChannels')

;
(async() => {
    const instance = await PaymentChannels.deployed() // returns instance of PaymentChannel contract that was previously deployed
        // newChannel(test, instance)   // tested pass/ fail conditions, all tests are working
    updateState(test, instance) // tested pass/ fail conditions, 6/9 tests working as expected
        // endChannel(test, instance)   // tested pass/ fail conditions, all tests are working
        // closeChannel(test, instance) // needs work...
})()