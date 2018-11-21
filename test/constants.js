const {Wallet} = require('ethers')

let MNEMONIC = "cook mango twist then skin sort option civil have still rather guilt"

let path =  "m/44'/60'/0'/0/"
let ACCT_A = new Wallet.fromMnemonic(MNEMONIC, path + 7).signingKey
let ACCT_B = new Wallet.fromMnemonic(MNEMONIC, path + 8).signingKey
let ACCT_C = new Wallet.fromMnemonic(MNEMONIC, path + 9).signingKey
ACCT_A.address = web3.utils.toChecksumAddress(ACCT_A.address)
ACCT_B.address = web3.utils.toChecksumAddress(ACCT_B.address)
ACCT_C.address = web3.utils.toChecksumAddress(ACCT_C.address)

module.exports = {
  ACCT_A,
  ACCT_B,
  ACCT_C,
  MNEMONIC,
  ZERO: '0x0000000000000000000000000000000000000000',
  CHANNEL_STATUS: {
    OPEN: 0,
    JOINED: 1,
    CHALLENGE: 2,
    CLOSED: 3
  }
};
