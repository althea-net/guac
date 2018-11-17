To test this contract first install node 8 or above. Then run `npm install`, `npm run testrpc` (keep this running in the background), `npm run migrate`, finally run `npm run test` to run the unit tests. There may be a bug in testrpc that prevents all the tests being run at once, so you can use blue-tape's test.only function to run only one of them.

# ABI Documentation

## newChannel

- bytes32 \_channelId: This is used for several purposes:

  - Identifying the channel in logs
  - Looking up the channel

- address \_address0:
- address \_address1:

- uint256 \_balance0:
- uint256 \_balance1:

- uint256 \_expiration:
- uint256 \_settlingPeriodLength:

- bytes \_signature0:
- bytes \_signature1:

## To Do:

- Missing test case for unsorted addresses
- Check for other missing test cases
