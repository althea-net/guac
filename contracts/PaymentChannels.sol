pragma solidity ^0.4.24;
import "./ECVerify.sol";
import "./ETHWallet.sol";

/// @dev To test this contract first install node 8 or above. Then run `npm install`, `npm run testrpc` (keep this running in the background), `npm run migrate`, finally run `npm run test` to run the unit tests.
contract PaymentChannels is ECVerify, ETHWallet {
    struct Channel {
        address address0;
        address address1;
        uint256 totalBalance;
        uint256 balance0;
        uint256 balance1;
        uint256 sequenceNumber;
        uint256 settlingPeriodLength;
        bool settlingPeriodStarted;
        uint256 settlingPeriodEnd;
    }

    event ChannelOpened(
        address indexed address0,
        address indexed address1,
        bytes32 _channelId
    );

    event SettlingStarted(
        bytes32 indexed _channelId,
        uint256 _sequenceNumber
    );

    event ChannelReDrawn(
        bytes32 indexed _channelId
    );

    mapping (bytes32 => Channel) public channels;
    mapping (address => mapping (address => bool)) public channelBetweenPairs;

    function txNotExpired (uint256 _expiration) internal view {
        require(block.number < _expiration, "tx is expired");
    }

    function channelDoesNotExist (bytes32 _channelId) internal view {
        require(channels[_channelId].address0 == address(0), "channel already exists");
    }

    function noChannelBetweenPair (address _address0, address _address1) internal view {
        require(_address0 < _address1, "address0 must be lower than address1");
        require(!channelBetweenPairs[_address0][_address1], "there is already a channel between these addresses");
    }

    function channelExists (Channel _channel) internal pure {
        require(_channel.address0 != address(0), "channel does not exist");
    }

    function channelSettlingPeriodStarted (Channel _channel) internal pure {
        require(_channel.settlingPeriodStarted, "channel settling period has not started");
    }

    function channelSettlingPeriodNotStarted (Channel _channel) internal pure {
        require(!_channel.settlingPeriodStarted, "channel settling period as started");
    }

    function channelIsSettled (Channel _channel) internal view {
        require(
            _channel.settlingPeriodStarted && // If the settling period has started
            block.number >= _channel.settlingPeriodEnd, // And ended
             "channel is not yet settled"
        );
    }

    function channelIsNotSettled (Channel _channel) internal view {
        require(
            !( // Negate the below
                _channel.settlingPeriodStarted && // If the settling period is started
                block.number >= _channel.settlingPeriodEnd // And ended
                
            ),  "channel is already settled"
        );
    }

    function balancesEqualTotal (Channel _channel, uint256 _balance0, uint256 _balance1) internal view {
        require(_balance0.add(_balance1) == _channel.totalBalance,  "balances do not equal total");
    }

    function sequenceNumberIsHighest (Channel _channel, uint256 _sequenceNumber) internal pure {
        require(_sequenceNumber > _channel.sequenceNumber,  "sequence number is not the highest");
    }

    function signedBy (
        bytes32 _fingerprint,
        bytes _signature,
        address _address
    ) internal {
        require(ecverify(_fingerprint, _signature, _address),  "invalid signature");
    }

    function signedByBoth (
        bytes32 _fingerprint,
        bytes _signature0,
        bytes _signature1,
        address _address0,
        address _address1
    ) internal {
        require(
            ecverify(_fingerprint, _signature0, _address0) &&
            ecverify(_fingerprint, _signature1, _address1),  "at least one signature invalid"
        );
    }

    function signedByOne (
        bytes32 _fingerprint,
        bytes _signature,
        address _address0,
        address _address1
    ) internal {
        require(
            ecverify(_fingerprint, _signature, _address0) ||
            ecverify(_fingerprint, _signature, _address1),  "both signatures invalid"
        );
    }

    function incrementBalance(address _addr, uint _value)
        internal
    {
        ethBalances[_addr] = ethBalances[_addr].add(_value);
    }

    function decrementBalance(address _addr, uint _value)
        internal
    {
        ethBalances[_addr] = ethBalances[_addr].sub(_value);
    }

    /// @dev Create a new channel between two nodes. _address0 must be numerically smaller than _address1. This will generate a channelId which is used to make other transactions on this channel. It emits a ChannelOpened event which is indexed by _address0, _address1 and also contains the _channelId.
    /// @param _address0 The numerically lower address of one of the channel participants. 
    /// @param _address1 The numerically higher address of the other channel participant.
    /// @param _balance0 The amount that _address0 would like to lock in the channel.
    /// @param _balance1 The amount that _address1 would like to lock in the channel. Address0 and address1 must have enough money to cover these amounts, and it is withdrawn from their accounts when this tx is submitted. 
    /// @param _expiration The block that this newChannel tx will expire. The purpose of the expiration is to prevent a scenario where an attacker submits an old, forgotten newChannel tx in the future, causing an unexpected withdrawal of our funds into the channel. If this is set to be too soon in the future, then it may not be possible to get this tx countersigned and onto the blockchain in time.
    /// @param _settlingPeriodLength This is the amount of time that the channel will remain in settling mode during a contentious close. If this is set too short, it may not be possible for a node (or bounty hunter) to prevent an old update attack before the settling period ends. If this is set too long, it will allow an attacker to unfairly lock up an honest node's funds for an unreasonable amount of time.

    function newChannel(
        address _address0,
        address _address1,

        uint256 _balance0,
        uint256 _balance1,

        uint256 _expiration,
        uint256 _settlingPeriodLength,

        bytes _signature0,
        bytes _signature1
    ) public {
        noChannelBetweenPair(_address0, _address1);
        txNotExpired(_expiration);

        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "newChannel",
            address(this),
            _address0,
            _address1,
            _balance0,
            _balance1,
            _expiration,
            _settlingPeriodLength
          )
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            _address0,
            _address1
        );

        bytes32 channelId = keccak256( 
          abi.encodePacked(
            block.number,
            address(this),
            _address0,
            _address1
          )
        ); 


        channels[channelId] = Channel(
            _address0,                   // address address0;
            _address1,                   // address address1;
            _balance0.add(_balance1),    // uint256 totalBalance;

            _balance0,                   // uint256 balance0;
            _balance1,                   // uint256 balance1;
            0,                           // uint256 sequenceNumber;

            _settlingPeriodLength,       // uint256 settlingPeriodLength;
            false,                       // bool settlingPeriodStarted;
            0                           // uint256 settlingPeriodEnd;
        );

        channelBetweenPairs[_address0][_address1] = true;

        emit ChannelOpened(
            _address0,
            _address1,
            channelId
        );

        decrementBalance(_address0, _balance0);
        decrementBalance(_address1, _balance1);
    }

    /// @dev Update the balances in the channel to make a payment from one node to another. 
    /// @param _channelId The channelId of the channel to update.
    /// @param _sequenceNumber The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail.
    /// @param _balance0 The balance of address0.
    /// @param _balance1 The balance of address1. These balances must add up to the channel's totalBalance.
    
    function updateState(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes _signature0,
        bytes _signature1
    ) public {
        Channel storage channel = channels[_channelId];
        channelExists(channel);
        channelIsNotSettled(channel);
        sequenceNumberIsHighest(channel, _sequenceNumber);
        balancesEqualTotal(channel, _balance0, _balance1);

        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "updateState",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
          )
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channel.address0,
            channel.address1
        );

        channel.sequenceNumber = _sequenceNumber;
        channel.balance0 = _balance0;
        channel.balance1 = _balance1;
    }

    /// @dev Submit an updateTx on behalf of another node and recieve a bounty if this saves them from an old update attack.
    /// @param _channelId The channelId of the channel to update.
    /// @param _sequenceNumber The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail.
    /// @param _balance0 The balance of address0.
    /// @param _balance1 The balance of address1. These balances must add up to the channel's totalBalance.
    /// @param _signature0 The signature of address0 on the updateTx.
    /// @param _signature1 The signature of address1 on the updateTx.
    /// @param _bountyAmount The amount of the bounty that will be granted to the node submitting this transaction if it will prevent an old update attack on address0 or address1.
    /// @param _bountySignature The signature of the account paying the bounty.

    function updateStateWithBounty(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes _signature0,
        bytes _signature1,

        uint256 _bountyAmount,
        bytes _bountySignature
    ) public {
        Channel memory channel = channels[_channelId];
        channelSettlingPeriodStarted(channel);

        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "updateStateWithBounty",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1,
            _signature0,
            _signature1,
            _bountyAmount
          )
        );

        address bountyPayer = ecrecovery(fingerprint, _bountySignature);

        decrementBalance(bountyPayer, _bountyAmount);
        incrementBalance(msg.sender, _bountyAmount);

        updateState(
            _channelId,
            _sequenceNumber,

            _balance0,
            _balance1,

            _signature0,
            _signature1
        );
    }

    /// @dev Close the channel and transfer the current balances back to the participants. 
    /// @param _channelId The channelId of the channel to update.
    /// @param _sequenceNumber The sequence number of the update. If an update with a higher sequence number has already been added, this updateState tx will fail.
    /// @param _balance0 The balance of address0.
    /// @param _balance1 The balance of address1. These balances must add up to the channel's totalBalance, and will be sent to address0 and address1 when this tx is submitted.

    function closeChannelFast (
        bytes32 _channelId,

        uint256 _sequenceNumber,
        uint256 _balance0,
        uint256 _balance1,

        bytes _signature0,
        bytes _signature1
    ) public {
        Channel storage channel = channels[_channelId];

        channelExists(channel);
        sequenceNumberIsHighest(channel, _sequenceNumber);
        balancesEqualTotal(channel, _balance0, _balance1);

        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "closeChannelFast",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
          )
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channel.address0,
            channel.address1
        );

        channel.sequenceNumber = _sequenceNumber;
        channel.balance0 = _balance0;
        channel.balance1 = _balance1;

        incrementBalance(channel.address0, channel.balance0);
        incrementBalance(channel.address1, channel.balance1);

        delete channelBetweenPairs[channel.address0][channel.address1];
        delete channels[_channelId];
    }

    /// @dev Start the channel's settling period. This is used in the event of a contentious channel closing, where the participants can not agree to sign a closeChannelFast tx. This only requires the signature of one of the participants.
    /// @param _channelId The Id of the channel to settle.
    /// @param _signature The signature of address0 or address1.

    function startSettlingPeriod (
        bytes32 _channelId,
        bytes _signature
    ) public {
        Channel storage channel = channels[_channelId];
        channelExists(channel);
        channelSettlingPeriodNotStarted(channel);

        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "startSettlingPeriod",
            address(this),
            _channelId
          )
        );

        signedByOne(
            fingerprint,
            _signature,
            channel.address0,
            channel.address1
        );

        channel.settlingPeriodStarted = true;
        channel.settlingPeriodEnd = block.number + channel.settlingPeriodLength;

        emit SettlingStarted(
            _channelId,
            channel.sequenceNumber
        );
    }

    /// @dev Close the channel after a settling period has been started and has ended, transfering the balances in the last updateState tx back to the participants. This is only used in a contentious closing, where startSettlingPeriod has already been called.
    /// @param _channelId The Id of the channel to be closed.

    function closeChannel (
        bytes32 _channelId
    ) public {
        Channel storage channel = channels[_channelId];

        channelExists(channel);
        channelIsSettled(channel);

        incrementBalance(channel.address0, channel.balance0);
        incrementBalance(channel.address1, channel.balance1);

        delete channelBetweenPairs[channel.address0][channel.address1];
        delete channels[_channelId];
    }

    /// @dev Refill or withdraw money from a channel which is currently open. This is equivalent to both participants signing and sumbitting a closeChannelFast tx followed by a newChannel tx, except that the channelId, the settlingPeriod, and the current sequenceNumber do not change. This logs a ChannelReDrawn event containing the channelId
    /// @param _channelId The Id of the channel to ReDraw.
    /// @param _sequenceNumber The channel's current sequenceNumber.
    /// @param _oldBalance0 The balance of address0.
    /// @param _oldBalance1 The balance of address1.These balances must add up to the channel's totalBalance, and will be sent to address0 and address1 when this tx is submitted.
    /// @param _newBalance0 The intended new balance of address0.
    /// @param _newBalance1 The intended new balance of address1. Address0 and address1 must have enough money to cover these amounts, and it is withdrawn from their accounts when this tx is submitted. 
    /// @param _expiration The block that this tx expires. See documentation for the newChannel tx for more detail on why this exists.


    function reDraw (
        bytes32 _channelId,

        uint256 _sequenceNumber,
        uint256 _oldBalance0,
        uint256 _oldBalance1,

        uint256 _newBalance0,
        uint256 _newBalance1,

        uint256 _expiration,

        bytes _signature0,
        bytes _signature1
    ) public {
        Channel storage channel = channels[_channelId];

        channelExists(channel);
        sequenceNumberIsHighest(channel, _sequenceNumber);
        balancesEqualTotal(channel, _oldBalance0, _oldBalance1);
        txNotExpired(_expiration);


        bytes32 fingerprint = keccak256(
          abi.encodePacked(
            "reDraw",
            address(this),
            _channelId,

            _sequenceNumber,
            _oldBalance0,
            _oldBalance1,

            _newBalance0,
            _newBalance1,

            _expiration
          )
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channel.address0,
            channel.address1
        );

        channel.sequenceNumber = _sequenceNumber;

        channel.totalBalance = _newBalance0.add(_newBalance1);
        channel.balance0 = _newBalance0;
        channel.balance1 = _newBalance1;

        emit ChannelReDrawn(
            _channelId
        );

        incrementBalance(channel.address0, _oldBalance0);
        incrementBalance(channel.address1, _oldBalance1);
        decrementBalance(channel.address0, _newBalance0);
        decrementBalance(channel.address1, _newBalance1);
    }
}
