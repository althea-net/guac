pragma solidity ^0.4.11;
import "./ECVerify.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";


contract PaymentChannels is ECVerify, MintableToken {
    event LogString(string label, string message);
    event LogBytes(string label, bytes message);
    event LogBytes32(string label, bytes32 message);
    event LogAddresses(string label, address addr0, address addr1);
    event LogUint256(string label, uint256 num);
    event LogInt256(string label, int256 num);
    event LogBool(string label, bool message);

    event NewChannel(bytes32 channelId);

    mapping (bytes32 => Channel) public channels;
    mapping (bytes32 => bool) seenPreimage;

    function channelDoesNotExist (bytes32 _channelId) {
        require(channels[_channelId].channelId != _channelId);
    }

    function channelExists (bytes32 _channelId) {
        require(channels[_channelId].channelId == _channelId);
    }

    function channelIsNotEnded (bytes32 _channelId) {
        require(!channels[_channelId].ended);
    }

    function channelIsNotClosed (bytes32 _channelId) {
        require(!channels[_channelId].closed);
    }

    function channelIsSettled (bytes32 _channelId) {
        require(
            channels[_channelId].ended && // If the channel has ended
            block.number >= channels[_channelId].settlingBlock // And the settling block has happened, settling block is defined as the current block.number + settling period (holdoff time) 
        );
    }

    function channelIsNotSettled (bytes32 _channelId) {
        require(!(
            channels[_channelId].ended && // If the channel has ended
            block.number >= channels[_channelId].settlingBlock // And the settling block has happened, settling block is defined as the current block.number + settling period (holdoff time)
        ));
    }

    function balancesEqualTotal (bytes32 _channelId, uint256 _balance0, uint256 _balance1) {
        require(_balance0.add(_balance1) == channels[_channelId].totalBalance);
    }

    function sequenceNumberIsHighest (bytes32 _channelId, uint256 _sequenceNumber) {
        require(_sequenceNumber > channels[_channelId].sequenceNumber);
    }

    function signedByBoth (
        bytes32 _fingerprint, 
        bytes _signature0, 
        bytes _signature1, 
        address _address0,
        address _address1
    ) {
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
    ) {
        require(
            ecverify(_fingerprint, _signature, _address0) ||
            ecverify(_fingerprint, _signature, _address1)
        );
    }

    function incrementBalance(address _addr, uint _value) internal {
        balances[_addr] = balances[_addr].add(_value);
    }

    function decrementBalance(address _addr, uint _value) internal {
        balances[_addr] = balances[_addr].sub(_value);
    }

    struct Channel {
        bytes32 channelId;
        address address0;
        address address1;

        bool ended;
        bool closed;
        uint256 settlingPeriod;
        uint256 settlingBlock;

        uint256 balance0;
        uint256 balance1;
        uint256 totalBalance;

        bytes hashlocks;

        uint256 sequenceNumber;
    }

    function newChannel(
        bytes32 _channelId,

        address _address0,
        address _address1,

        uint256 _balance0,
        uint256 _balance1,

        uint256 _settlingPeriod,

        bytes _signature0,
        bytes _signature1
    ) {
        channelDoesNotExist(_channelId);
        bytes32 fingerprint = sha3(
            "newChannel", 
            _channelId,

            _address0,
            _address1,

            _balance0,
            _balance1,

            _settlingPeriod
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
            
            false,                       // bool ended;
            false,                       // bool closed;
            _settlingPeriod,            // uint256 settlingPeriod;
            0,                           // uint256 settlingBlock;

            _balance0,                   // uint256 balance0;
            _balance1,                   // uint256 balance1;
            _balance0.add(_balance1),    // uint256 totalBalance;

            new bytes(0),                // bytes hashlocks

            0                            // uint256 sequenceNumber;
        );

        NewChannel(_channelId);
    }

    function updateState(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes _hashlocks,

        bytes _signature0,
        bytes _signature1
    ) {
        channelExists(_channelId);
        channelIsNotSettled(_channelId);
        sequenceNumberIsHighest(_channelId, _sequenceNumber);
        balancesEqualTotal(_channelId, _balance0, _balance1); // Might not be neccesary, but maybe want it anyway

        bytes32 fingerprint = sha3(
            "updateState",
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1,
            _hashlocks
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
        channels[_channelId].hashlocks = _hashlocks;
    }

    function submitPreimages (
        bytes pairs
    ) {
        bytes32 hashed;
        bytes32 preimage;

        for (uint256 i = 0; i < pairs.length; i += 64) {
            uint256 hashedOffset = i + 32;
            uint256 preimageOffset = i + 64;

            assembly {
                hashed := mload(add(pairs, hashedOffset))
                preimage := mload(add(pairs, preimageOffset))
            }

            submitPreimage(hashed, preimage);
        }
    }

    function submitPreimage (
        bytes32 _hashed,
        bytes32 _preimage
    ) {
        require(_hashed == sha3(_preimage));
        seenPreimage[_hashed] = true;
        SawPreimage(_hashed, _preimage);
    }

    event SawPreimage(bytes32 hashed, bytes32 preimage);

    function endChannel (
        bytes32 _channelId,
        bytes _signature
    ) {
        channelExists(_channelId);
        channelIsNotEnded(_channelId);

        bytes32 fingerprint = sha3(
            "endChannel",
            _channelId
        );

        signedByOne(
            fingerprint,
            _signature,
            channels[_channelId].address0,
            channels[_channelId].address1
        );

        channels[_channelId].ended = true;
        channels[_channelId].settlingBlock = block.number  + channels[_channelId].settlingPeriod;
    }

    function closeChannel (
        bytes32 _channelId
    ) {
        channelExists(_channelId);
        channelIsSettled(_channelId);
        channelIsNotClosed(_channelId);

        uint256 balance0;
        uint256 balance1;

        channels[_channelId].closed = true;

        int256 adjustment = getHashlockAdjustment(channels[_channelId].hashlocks);

        (balance0, balance1) = applyHashlockAdjustment(
            _channelId,
            channels[_channelId].balance0,
            channels[_channelId].balance1,
            adjustment
        );

        incrementBalance(channels[_channelId].address0, balance0);
        incrementBalance(channels[_channelId].address1, balance1);
    }

    function getHashlockAdjustment (
        bytes _hashlocks
    ) 
        internal
        returns (int256 totalAdjustment)
    {
        bytes32 hashed;
        int256 adjustment;

        for (uint256 i = 0; i < _hashlocks.length; i += 64) {
            uint256 hashedOffset = i + 32;
            uint256 adjustmentOffset = i + 64;

            assembly {
                hashed := mload(add(_hashlocks, hashedOffset))
                adjustment := mload(add(_hashlocks, adjustmentOffset))
            }

            if (seenPreimage[hashed]) {
                totalAdjustment += adjustment;
            }
            AppliedHashlock(hashed, adjustment);
        }
    }

    event AppliedHashlock(bytes32 hashed, int256 adjustment);

    function applyHashlockAdjustment (
        bytes32 _channelId,
        uint256 _currentBalance0,
        uint256 _currentBalance1,
        int256 _totalAdjustment
    )
        internal
        returns (uint256 balance0, uint256 balance1)
    {
        if (_totalAdjustment > 0) {
            balance0 = _currentBalance0.add(uint256(_totalAdjustment));
            balance1 = _currentBalance1.sub(uint256(_totalAdjustment));
        }

        if (_totalAdjustment < 0) {
            balance0 = _currentBalance0.sub(uint256(-_totalAdjustment));
            balance1 = _currentBalance1.add(uint256(-_totalAdjustment));
        }

        if (_totalAdjustment == 0) {
            balance0 = _currentBalance0;
            balance1 = _currentBalance1;
        }

        balancesEqualTotal(_channelId, balance0, balance1);
    }
}
