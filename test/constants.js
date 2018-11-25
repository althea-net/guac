const {Wallet} = require('ethers')

// The only constant that matters
let MNEMONIC = "cook mango twist then skin sort option civil have still rather guilt"

let path =  "m/44'/60'/0'/0/"
let ACCT_A = new Wallet.fromMnemonic(MNEMONIC, path + 7).signingKey
let ACCT_B = new Wallet.fromMnemonic(MNEMONIC, path + 8).signingKey
let ACCT_C = new Wallet.fromMnemonic(MNEMONIC, path + 9).signingKey

module.exports = {
  ACCT_A,
  ACCT_B,
  ACCT_C,
  MNEMONIC,
  ZERO: '0x0000000000000000000000000000000000000000',
};
