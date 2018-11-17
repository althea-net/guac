pragma solidity ^0.4.11;
import "./ECVerify.sol";
import "./ETHWallet.sol";


contract PaymentChannels is ECVerify, ETHWallet {
    struct Channel {
        bytes32 channelId;
        address address0;
        address address1;
        uint256 totalBalance;
        uint256 balance0;
        uint256 balance1;
        uint256 sequenceNumber;
        uint256 settlingPeriodLength;
        bool settlingPeriodStarted;
        uint256 settlingPeriodEnd;
        bool closed;
    }

    event ChannelOpened(
        bytes32 indexed _channelId
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
        require(block.number < _expiration);
    }

    function channelDoesNotExist (bytes32 _channelId) internal view {
        require(channels[_channelId].channelId != _channelId);
    }

    function noChannelBetweenPair (address _address0, address _address1) internal view {
        require(_address0 < _address1);
        require(!channelBetweenPairs[_address0][_address1]);
    }

    function channelExists (Channel _channel) internal pure {
        require(_channel.address0 != address(0));
    }

    function channelSettlingPeriodStarted (Channel _channel) internal pure {
        require(_channel.settlingPeriodStarted);
    }

    function channelSettlingPeriodNotStarted (Channel _channel) internal pure {
        require(!_channel.settlingPeriodStarted);
    }

    function channelIsNotClosed (Channel _channel) internal pure {
        require(!_channel.closed);
    }

    function channelIsSettled (Channel _channel) internal view {
        require(
            _channel.settlingPeriodStarted && // If the settling period has started
            block.number >= _channel.settlingPeriodEnd // And ended
        );
    }

    function channelIsNotSettled (Channel _channel) internal view {
        require(
            !( // Negate the below
                _channel.settlingPeriodStarted && // If the settling period is started
                block.number >= _channel.settlingPeriodEnd // And ended
            )
        );
    }

    function balancesEqualTotal (Channel _channel, uint256 _balance0, uint256 _balance1) internal view {
        require(_balance0.add(_balance1) == _channel.totalBalance);
    }

    function sequenceNumberIsHighest (Channel _channel, uint256 _sequenceNumber) internal pure {
        require(_sequenceNumber > _channel.sequenceNumber);
    }

    function signedBy (
        bytes32 _fingerprint,
        bytes _signature,
        address _address
    ) internal {
        require(ecverify(_fingerprint, _signature, _address));
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
            ecverify(_fingerprint, _signature1, _address1)
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
            ecverify(_fingerprint, _signature, _address1)
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

    function newChannel(
        bytes32 _channelId,

        address _address0,
        address _address1,

        uint256 _balance0,
        uint256 _balance1,

        uint256 _expiration,
        uint256 _settlingPeriodLength,

        bytes _signature0,
        bytes _signature1
    ) public {
        channelDoesNotExist(_channelId);
        noChannelBetweenPair(_address0, _address1);
        txNotExpired(_expiration);

        bytes32 fingerprint = sha3(
            "newChannel",
            address(this),
            _channelId,

            _address0,
            _address1,

            _balance0,
            _balance1,

            _expiration,
            _settlingPeriodLength
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            _address0,
            _address1
        );

        channels[_channelId] = Channel(
            _channelId,                  // bytes32 channelId;
            _address0,                   // address address0;
            _address1,                   // address address1;
            _balance0.add(_balance1),    // uint256 totalBalance;

            _balance0,                   // uint256 balance0;
            _balance1,                   // uint256 balance1;
            0,                           // uint256 sequenceNumber;

            _settlingPeriodLength,       // uint256 settlingPeriodLength;
            false,                       // bool settlingPeriodStarted;
            0,                           // uint256 settlingPeriodEnd;
            false                        // bool closed;

        );

        channelBetweenPairs[_address0][_address1] = true;

        ChannelOpened(
            _channelId
        );

        decrementBalance(_address0, _balance0);
        decrementBalance(_address1, _balance1);
    }

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

        bytes32 fingerprint = sha3(
            "updateState",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
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

        bytes32 fingerprint = sha3(
            "updateStateWithBounty",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1,
            _signature0,
            _signature1,
            _bountyAmount
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

    function startSettlingPeriod (
        bytes32 _channelId,
        bytes _signature
    ) public {
        Channel storage channel = channels[_channelId];
        channelExists(channel);
        channelSettlingPeriodNotStarted(channel);

        bytes32 fingerprint = sha3(
            "startSettlingPeriod",
            address(this),
            _channelId
        );

        signedByOne(
            fingerprint,
            _signature,
            channel.address0,
            channel.address1
        );

        channel.settlingPeriodStarted = true;
        channel.settlingPeriodEnd = block.number + channel.settlingPeriodLength;
        

        SettlingStarted(
            _channelId,
            channel.sequenceNumber
        );
    }

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

        bytes32 fingerprint = sha3(
            "closeChannelFast",
            address(this),
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channel.address0,
            channel.address1
        );

        channel.closed = true;

        channel.sequenceNumber = _sequenceNumber;
        channel.balance0 = _balance0;
        channel.balance1 = _balance1;

        incrementBalance(channel.address0, channel.balance0);
        incrementBalance(channel.address1, channel.balance1);

        delete channelBetweenPairs[channel.address0][channel.address1];
        delete channels[_channelId];
    }

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


        bytes32 fingerprint = sha3(
            "reDraw",
            address(this),
            _channelId,

            _sequenceNumber,
            _oldBalance0,
            _oldBalance1,

            _newBalance0,
            _newBalance1,

            _expiration
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

        ChannelReDrawn(
            _channelId
        );

        incrementBalance(channel.address0, _oldBalance0);
        incrementBalance(channel.address1, _oldBalance1);
        decrementBalance(channel.address0, _newBalance0);
        decrementBalance(channel.address1, _newBalance1);
    }
}
