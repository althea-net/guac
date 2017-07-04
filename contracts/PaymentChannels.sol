pragma solidity ^0.4.11;
import "ECVerify.sol";
import './zeppelin/token/StandardToken.sol';


contract PaymentChannels is ECVerify, StandardToken {
    mapping (bytes32 => Channel) channels;

    modifier channelDoesNotExist (bytes32 _channelId) {
        require(channels[_channelId].channelId != _channelId);
        _;
    }

    modifier channelExists (bytes32 _channelId) {
        require(channels[_channelId].channelId == _channelId);
        _;
    }

    modifier channelIsOpen (bytes32 _channelId) {
        require(channels[_channelId].open);
        _;
    }

    modifier channelIsFunded (bytes32 _channelId) {
        require(channels[_channelId].funded);
        _;
    }

    modifier channelIsSettled (bytes32 _channelId) {
        require(
            !channels[_channelId].open &&
            block.number >= channels[_channelId].settlingBlock
        );
        _;
    }

    modifier channelIsNotSettled (bytes32 _channelId) {
        require(
            channels[_channelId].open ||
            block.number < channels[_channelId].settlingBlock
        );
        _;
    }

    modifier balancesEqualTotal (bytes32 _channelId, uint256 _balance0, uint256 _balance1) {
        require(_balance0.add(_balance1) == channels[_channelId].totalBalance);
        _;
    }

    modifier sequenceNumberIsHighest (bytes32 _channelId) {
        require(sequenceNumber > channels[_channelId].sequenceNumber);
        _;
    }

    function signedByBoth (
        bytes32 _fingerprint, 
        bytes32 _signature0, 
        bytes32 _signature1, 
        bytes32 _channelId
    ) {
        require(
            ecverify(_fingerprint, _signature0, channels[_channelId].address0) &&
            ecverify(_fingerprint, _signature1, channels[_channelId].address1)
        );
    }

    function signedByOne (
        bytes32 _fingerprint,
        bytes32 _signature,
        bytes32 _channelId
    ) {
        require(
            ecverify(_fingerprint, _signature, channels[_channelId].address0) ||
            ecverify(_fingerprint, _signature, channels[_channelId].address1)
        );
    }

    function incrementBalance(address _addr, uint _value) {
        balances[_addr] = balances[_addr].add(_value);
    }

    function decrementBalance(address _addr, uint _value) {
        balances[_addr] = balances[_addr].sub(_value);
    }

    struct Channel {
        bytes32 channelId;
        address address0;
        address address1;

        bool open;
        bool funded;
        uint256 settlingPeriod;
        uint256 settlingBlock;

        uint256 balance0;
        uint256 balance1;

        uint256 sequenceNumber;
    }

    function getChannel(bytes32 _channelId) returns(
        address address0,
        address address1,

        bool open,
        bool funded,
        uint settlingPeriod,
        uint settlingBlock,

        uint256 balance0,
        uint256 balance1,
        uint256 totalBalance,

        uint sequenceNumber
    ) {
        address0 = channels[_channelId].address0;
        address1 = channels[_channelId].address1;
        open = channels[_channelId].open;
        settlingPeriod = channels[_channelId].settlingPeriod;
        settlingBlock = channels[_channelId].settlingBlock;
        state = channels[_channelId].state;
        sequenceNumber = channels[_channelId].sequenceNumber;
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
    ) channelDoesNotExist(_channelId)
    {
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
            _channelId
        );

        decrementBalance(_address0, _balance0);
        decrementBalance(_address1, _balance1);

        uint256 totalBalance = _balance0.add(_balance1);

        Channel memory channel = Channel(
            _channelId,      // bytes32 channelId;
            _address0,       // address address0;
            _address1,       // address address1;
            
            true,            // bool open;
            true,            // bool funded;
            _settlingPeriod, // uint16 settlingPeriod;
            0,               // uint16 settlingBlock;

            _balance0,       // uint256 balance0;
            _balance1,       // uint256 balance1;
            totalBalance,    // uint256 totalBalance;

            0                // uint16 sequenceNumber;
        );

        channels[_channelId] = channel;
    }

    function updateBalances(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes _signature0,
        bytes _signature1
    ) channelExists(_channelId)
      channelIsNotSettled(_channelId)
      sequenceNumberIsHighest(_channelId, _sequenceNumber)
      balancesEqualTotal(_channelId, _balance0, _balance1)
    {
        bytes32 fingerprint = sha3(
            "updateBalances",
            _channelId,
            _sequenceNumber,
            _balance0,
            _balance1
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature,
            _channelId
        );

        channels[_channelId].balance0 = _balance0;
        channels[_channelId].balance1 = _balance1;
        channels[_channelId].sequenceNumber = _sequenceNumber;
    }

    function updateBalancesHashlock(
        bytes32 _channelId,
        uint256 _sequenceNumber,

        uint256 _balance0,
        uint256 _balance1,

        bytes32 _hashed,
        bytes _preimage,

        bytes _signature0,
        bytes _signature1
    ) channelExists(_channelId)
      channelIsNotSettled(_channelId)
      sequenceNumberIsHighest(_channelId, _sequenceNumber)
      balancesEqualTotal(_channelId, _balance0, _balance1)
    {
        bytes32 fingerprint = sha3(
            "updateBalancesHashlock",
            _channelId,
            _sequenceNumber,
            _hashed,
            _balance0,
            _balance1
        );

        signedByBoth(
            fingerprint,
            _signature0,
            _signature,
            _channelId
        );

        require(sha3(_preimage) == _hashed);

        channels[_channelId].balance0 = _balance0;
        channels[_channelId].balance1 = _balance1;
        channels[_channelId].sequenceNumber = _sequenceNumber;
    }

    function closeChannel (
        bytes32 _channelId,
        bytes _signature
    ) channelExists(_channelId)
      channelIsOpen(_channelId)
    {
        bytes32 fingerprint = sha3(
            "closeChannel",
            _channelId
        );

        signedByOne(fingerprint, _signature, _channelId);

        channels[_channelId].open = false;
        channels[_channelId].settlingBlock = block.number + channels[channelId].settlingPeriod;
    }

    function withdraw(
        bytes32 _channelId
    ) channelExists(_channelId)
      channelIsSettled(_channelId)
      channelIsFunded(_channelId)
    {
        channels[_channelId].funded = false;
        channels[_channelId].totalBalance = 0;

        incrementBalance(channels[_channelId].address0, channels[_channelId].balance0);
        incrementBalance(channels[_channelId].address1, channels[_channelId].balance1);
    }
}
