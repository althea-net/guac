* [ECVerify](#ecverify)
  * [ecverify](#function-ecverify)
  * [ecrecovery](#function-ecrecovery)
* [ETHWallet](#ethwallet)
  * [withdraw](#function-withdraw)
  * [quickDeposit](#function-quickdeposit)
  * [depositToAddress](#function-deposittoaddress)
  * [balanceOf](#function-balanceof)
* [PaymentChannels](#paymentchannels)
  * [updateState](#function-updatestate)
  * [reDraw](#function-redraw)
  * [closeChannelFast](#function-closechannelfast)
  * [withdraw](#function-withdraw)
  * [ecverify](#function-ecverify)
  * [newChannel](#function-newchannel)
  * [quickDeposit](#function-quickdeposit)
  * [closeChannel](#function-closechannel)
  * [depositToAddress](#function-deposittoaddress)
  * [balanceOf](#function-balanceof)
  * [ecrecovery](#function-ecrecovery)
  * [channels](#function-channels)
  * [startSettlingPeriod](#function-startsettlingperiod)
  * [channelBetweenPairs](#function-channelbetweenpairs)
  * [updateStateWithBounty](#function-updatestatewithbounty)
  * [ChannelOpened](#event-channelopened)
  * [SettlingStarted](#event-settlingstarted)
  * [ChannelReDrawn](#event-channelredrawn)
* [SafeMath](#safemath)

# ECVerify


## *function* ecverify

ECVerify.ecverify(hash, sig, signer) `nonpayable` `39cdde32`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |
| *bytes* | sig | undefined |
| *address* | signer | undefined |


## *function* ecrecovery

ECVerify.ecrecovery(hash, sig) `nonpayable` `77d32e94`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |
| *bytes* | sig | undefined |


---
# ETHWallet


## *function* withdraw

ETHWallet.withdraw(amount) `nonpayable` `2e1a7d4d`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | amount | undefined |


## *function* quickDeposit

ETHWallet.quickDeposit() `payable` `4c0f0e12`





## *function* depositToAddress

ETHWallet.depositToAddress(_address) `payable` `562cc33c`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _address | undefined |


## *function* balanceOf

ETHWallet.balanceOf(_address) `view` `70a08231`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _address | undefined |


---
# PaymentChannels


## *function* updateState

PaymentChannels.updateState(_channelId, _sequenceNumber, _balance0, _balance1, _signature0, _signature1) `nonpayable` `070eae11`

> Update the balances in the channel to make a payment from one node to another. 

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The channelId of the channel to update. |
| *uint256* | _sequenceNumber | The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail. |
| *uint256* | _balance0 | The balance of address0. |
| *uint256* | _balance1 | The balance of address1. These balances must add up to the channel's totalBalance. |
| *bytes* | _signature0 | undefined |
| *bytes* | _signature1 | undefined |


## *function* reDraw

PaymentChannels.reDraw(_channelId, _sequenceNumber, _oldBalance0, _oldBalance1, _newBalance0, _newBalance1, _expiration, _signature0, _signature1) `nonpayable` `2197daa1`

> Refill or withdraw money from a channel which is currently open. This is equivalent to both participants signing and sumbitting a closeChannelFast tx followed by a newChannel tx, except that the channelId, the settlingPeriod, and the current sequenceNumber do not change. This logs a ChannelReDrawn event containing the channelId

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The Id of the channel to ReDraw. |
| *uint256* | _sequenceNumber | The channel's current sequenceNumber. |
| *uint256* | _oldBalance0 | The balance of address0. |
| *uint256* | _oldBalance1 | The balance of address1.These balances must add up to the channel's totalBalance, and will be sent to address0 and address1 when this tx is submitted. |
| *uint256* | _newBalance0 | The intended new balance of address0. |
| *uint256* | _newBalance1 | The intended new balance of address1. Address0 and address1 must have enough money to cover these amounts, and it is withdrawn from their accounts when this tx is submitted.  |
| *uint256* | _expiration | The block that this tx expires. See documentation for the newChannel tx for more detail on why this exists. |
| *bytes* | _signature0 | undefined |
| *bytes* | _signature1 | undefined |


## *function* closeChannelFast

PaymentChannels.closeChannelFast(_channelId, _sequenceNumber, _balance0, _balance1, _signature0, _signature1) `nonpayable` `2d1eda18`

> Close the channel and transfer the current balances back to the participants. 

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The channelId of the channel to update. |
| *uint256* | _sequenceNumber | The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail. |
| *uint256* | _balance0 | The balance of address0. |
| *uint256* | _balance1 | The balance of address1. These balances must add up to the channel's totalBalance, and will be sent to address0 and address1 when this tx is submitted. |
| *bytes* | _signature0 | undefined |
| *bytes* | _signature1 | undefined |


## *function* withdraw

PaymentChannels.withdraw(amount) `nonpayable` `2e1a7d4d`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | amount | undefined |


## *function* ecverify

PaymentChannels.ecverify(hash, sig, signer) `nonpayable` `39cdde32`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |
| *bytes* | sig | undefined |
| *address* | signer | undefined |


## *function* newChannel

PaymentChannels.newChannel(_address0, _address1, _balance0, _balance1, _expiration, _settlingPeriodLength, _signature0, _signature1) `nonpayable` `454f7ed8`

> Create a new channel between two nodes. _address0 must be numerically smaller than _address1. This will generate a channelId which is used to make other transactions on this channel. It emits a ChannelOpened event which is indexed by _address0, _address1 and also contains the _channelId.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _address0 | The numerically lower address of one of the channel participants.  |
| *address* | _address1 | The numerically higher address of the other channel participant. |
| *uint256* | _balance0 | The amount that _address0 would like to lock in the channel. |
| *uint256* | _balance1 | The amount that _address1 would like to lock in the channel. Address0 and address1 must have enough money to cover these amounts, and it is withdrawn from their accounts when this tx is submitted.  |
| *uint256* | _expiration | The block that this newChannel tx will expire. The purpose of the expiration is to prevent a scenario where an attacker submits an old, forgotten newChannel tx in the future, causing an unexpected withdrawal of our funds into the channel. If this is set to be too soon in the future, then it may not be possible to get this tx countersigned and onto the blockchain in time. |
| *uint256* | _settlingPeriodLength | This is the amount of time that the channel will remain in settling mode during a contentious close. If this is set too short, it may not be possible for a node (or bounty hunter) to prevent an old update attack before the settling period ends. If this is set too long, it will allow an attacker to unfairly lock up an honest node's funds for an unreasonable amount of time. |
| *bytes* | _signature0 | undefined |
| *bytes* | _signature1 | undefined |


## *function* quickDeposit

PaymentChannels.quickDeposit() `payable` `4c0f0e12`





## *function* closeChannel

PaymentChannels.closeChannel(_channelId) `nonpayable` `4c2ee09d`

> Close the channel after a settling period has been started and has ended, transfering the balances in the last updateState tx back to the participants. This is only used in a contentious closing, where startSettlingPeriod has already been called.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The Id of the channel to be closed. |


## *function* depositToAddress

PaymentChannels.depositToAddress(_address) `payable` `562cc33c`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _address | undefined |


## *function* balanceOf

PaymentChannels.balanceOf(_address) `view` `70a08231`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _address | undefined |


## *function* ecrecovery

PaymentChannels.ecrecovery(hash, sig) `nonpayable` `77d32e94`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |
| *bytes* | sig | undefined |


## *function* channels

PaymentChannels.channels() `view` `7a7ebd7b`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* startSettlingPeriod

PaymentChannels.startSettlingPeriod(_channelId, _signature) `nonpayable` `d50e30ce`

> Start the channel's settling period. This is used in the event of a contentious channel closing, where the participants can not agree to sign a closeChannelFast tx. This only requires the signature of one of the participants.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The Id of the channel to settle. |
| *bytes* | _signature | The signature of address0 or address1. |


## *function* channelBetweenPairs

PaymentChannels.channelBetweenPairs(, ) `view` `e12d11a3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |
| *address* |  | undefined |


## *function* updateStateWithBounty

PaymentChannels.updateStateWithBounty(_channelId, _sequenceNumber, _balance0, _balance1, _signature0, _signature1, _bountyAmount, _bountySignature) `nonpayable` `fa7c09da`

> Submit an updateTx on behalf of another node and recieve a bounty if this saves them from an old update attack.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | The channelId of the channel to update. |
| *uint256* | _sequenceNumber | The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail. |
| *uint256* | _balance0 | The balance of address0. |
| *uint256* | _balance1 | The balance of address1. These balances must add up to the channel's totalBalance. |
| *bytes* | _signature0 | The signature of address0 on the updateTx. |
| *bytes* | _signature1 | The signature of address1 on the updateTx. |
| *uint256* | _bountyAmount | The amount of the bounty that will be granted to the node submitting this transaction if it will prevent an old update attack on address0 or address1. |
| *bytes* | _bountySignature | The signature of the account paying the bounty. |

## *event* ChannelOpened

PaymentChannels.ChannelOpened(address0, address1, _channelId) `a79f57c9`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | address0 | indexed |
| *address* | address1 | indexed |
| *bytes32* | _channelId | not indexed |

## *event* SettlingStarted

PaymentChannels.SettlingStarted(_channelId, _sequenceNumber) `3056d24b`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | indexed |
| *uint256* | _sequenceNumber | not indexed |

## *event* ChannelReDrawn

PaymentChannels.ChannelReDrawn(_channelId) `82e612a2`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _channelId | indexed |


---
# SafeMath


---