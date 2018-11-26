const tests = require('./runTests.js')

function sleep() {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve()
    }, 20000);
  });
}

contract("Main", () => {
  describe("", () => {
    it("", async () =>{
      await tests()
      await sleep();
    })
  })
})
