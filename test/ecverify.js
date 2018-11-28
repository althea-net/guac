const TestECVerify = artifacts.require("TestECVerify.sol")
const {ACCT_A} = require("./constants.js");

const {
  sign,
  solSha3,
} = require("./utils.js");

module.exports = context.only("ECVerify", async () => {
	let instance, fingerprint
	before(async () => {
		instance = await TestECVerify.new()
    fingerprint = solSha3("data")
	})

  it("basic", async () => {
    let sig = ACCT_A.signDigest(fingerprint)
    await instance.basic(
      fingerprint,
      sig.r,
      sig.s,
      sig.v,
      { from: ACCT_A.address }
    )
  })

  it("ecrecovery", async () => {
    let sig = sign(fingerprint, ACCT_A)
    await instance.ecrecovery(fingerprint, sig, {from: ACCT_A.address})
  })

  it("ecverify", async () => {
    let sig = sign(fingerprint, ACCT_A)
    await instance.ecverify(fingerprint, sig, ACCT_A.address, {from: ACCT_A.address})
  })

})
