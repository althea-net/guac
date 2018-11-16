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

    mapping (bytes32 => Channel) public channels;
    mapping (address => mapping (address => bool)) public channelBetweenPairs;

    function channelDoesNotExist (bytes32 _channelId) internal {
        require(channels[_channelId].channelId != _channelId);
    }

    function noChannelBetweenPair (address _address0, address _address1) internal {
        require(_address0 < _address1);
        require(!channelBetweenPairs[_address0][_address1]);
    }

    function channelExists (bytes32 _channelId) internal {
        require(channels[_channelId].channelId == _channelId);
    }

    function channelSettlingPeriodStarted (bytes32 _channelId) internal {
        require(channels[_channelId].settlingPeriodStarted);
    }

    function channelSettlingPeriodNotStarted (bytes32 _channelId) internal {
        require(!channels[_channelId].settlingPeriodStarted);
    }

    function channelIsNotClosed (bytes32 _channelId) internal {
        require(!channels[_channelId].closed);
    }

    function channelIsSettled (bytes32 _channelId) internal {
        require(
            channels[_channelId].settlingPeriodStarted && // If the settling period has started
            block.number >= channels[_channelId].settlingPeriodEnd // And ended
        );
    }

    function channelIsNotSettled (bytes32 _channelId) internal {
        require(
            !( // Negate the below
                channels[_channelId].settlingPeriodStarted && // If the settling period is started
                block.number >= channels[_channelId].settlingPeriodEnd // And ended
            )
        );
    }

    function balancesEqualTotal (bytes32 _channelId, uint256 _balance0, uint256 _balance1) internal {
        require(_balance0.add(_balance1) == channels[_channelId].totalBalance);
    }

    function sequenceNumberIsHighest (bytes32 _channelId, uint256 _sequenceNumber) internal {
        require(_sequenceNumber > channels[_channelId].sequenceNumber);
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

        uint256 _settlingPeriodLength,

        bytes _signature0,
        bytes _signature1
    ) public {
        channelDoesNotExist(_channelId);
        noChannelBetweenPair(_address0, _address1);

        bytes32 fingerprint = sha3(
            "newChannel",
            _channelId,

            _address0,
            _address1,

            _balance0,
            _balance1,

            _settlingPeriodLength
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            _address0,
            _address1
        );

        decrementBalance(_address0, _balance0);
        decrementBalance(_address1, _balance1);

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
    }

    function updateState(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes _signature0,
        bytes _signature1
    ) public {
        channelExists(_channelId);
        channelIsNotSettled(_channelId);
        sequenceNumberIsHighest(_channelId, _sequenceNumber);

        bytes32 fingerprint = sha3(
            "updateState",
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channels[_channelId].address0,
            channels[_channelId].address1
        );

        channels[_channelId].sequenceNumber = _sequenceNumber;
        channels[_channelId].balance0 = _balance0;
        channels[_channelId].balance1 = _balance1;
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
        channelSettlingPeriodStarted(_channelId);

        bytes32 fingerprint = sha3(
            "updateStateWithBounty",
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
        channelExists(_channelId);
        channelSettlingPeriodNotStarted(_channelId);

        bytes32 fingerprint = sha3(
            "startSettlingPeriod",
            _channelId
        );

        signedByOne(
            fingerprint,
            _signature,
            channels[_channelId].address0,
            channels[_channelId].address1
        );

        channels[_channelId].settlingPeriodStarted = true;
        channels[_channelId].settlingPeriodEnd = block.number + channels[_channelId].settlingPeriodLength;
    }

    function closeChannel (
        bytes32 _channelId
    ) public {
        channelExists(_channelId);
        channelIsSettled(_channelId);
        balancesEqualTotal(_channelId, channels[_channelId].balance0, channels[_channelId].balance1);

        incrementBalance(channels[_channelId].address0, channels[_channelId].balance0);
        incrementBalance(channels[_channelId].address1, channels[_channelId].balance1);

        delete channelBetweenPairs[channels[_channelId].address0][channels[_channelId].address1];
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
        channelExists(_channelId);
        sequenceNumberIsHighest(_channelId, _sequenceNumber);
        balancesEqualTotal(_channelId, _balance0, _balance1);

        bytes32 fingerprint = sha3(
            "closeChannelFast",
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature1,
            channels[_channelId].address0,
            channels[_channelId].address1
        );

        channels[_channelId].closed = true;

        channels[_channelId].sequenceNumber = _sequenceNumber;
        channels[_channelId].balance0 = _balance0;
        channels[_channelId].balance1 = _balance1;

        incrementBalance(channels[_channelId].address0, channels[_channelId].balance0);
        incrementBalance(channels[_channelId].address1, channels[_channelId].balance1);

        delete channelBetweenPairs[channels[_channelId].address0][channels[_channelId].address1];
        delete channels[_channelId];
    }
}
