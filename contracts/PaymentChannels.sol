pragma solidity ^0.4.11;
import "ECVerify.sol";


contract PaymentChannels is ECVerify, StandardToken {
    mapping (bytes32 => Channel) channels;

    modifier channelDoesNotExist (channelId) {
        require(channels[channelId].channelId != channelId);
        _;
    }

    modifier channelExists (channelId) {
        require(channels[channelId].channelId == channelId);
        _;
    }

    modifier channelIsOpen (channelId) {
        require(channels[channelId].open);
        _;
    }

    modifier channelIsFunded (channelId) {
        require(channels[channelId].funded);
        _;
    }

    modifier channelIsSettled (channelId) {
        require(
            !channels[channelId].open &&
            block.number >= channels[channelId].settlingBlock
        );
        _;
    }

    modifier channelIsNotSettled (channelId) {
        require(
            channels[channelId].open ||
            block.number < channels[channelId].settlingBlock
        );
        _;
    }

    modifier sequenceNumberIsHighest (channelId) {
        require(sequenceNumber > channels[channelId].sequenceNumber);
        _;
    }

    struct Channel {
        bytes32 channelId;
        address address0;
        address address1;

        bool open;
        bool funded;
        uint settlingPeriod;
        uint settlingBlock;

        uint256 balance0;
        uint256 balance1;

        uint sequenceNumber;
    }

    function getChannel(bytes32 channelId) returns(
        address address0,
        address address1,

        bool open,
        bool funded,
        uint settlingPeriod,
        uint settlingBlock,

        uint256 balance0,
        uint256 balance1,

        uint sequenceNumber
    ) {
        address0 = channels[channelId].address0;
        address1 = channels[channelId].address1;
        open = channels[channelId].open;
        settlingPeriod = channels[channelId].settlingPeriod;
        settlingBlock = channels[channelId].settlingBlock;
        state = channels[channelId].state;
        sequenceNumber = channels[channelId].sequenceNumber;
    }

    function newChannel(
        bytes32 channelId,

        address address0,
        address address1,

        uint256 balance0,
        uint256 balance1,

        uint256 settlingPeriod,

        bytes signature0,
        bytes signature1
    ) channelDoesNotExist(channelId)
    {
        bytes32 fingerprint = sha3(
            "newChannel",
            channelId,

            address0,
            address1,

            balance0,
            balance1,

            settlingPeriod
        );

        require(ecverify(fingerprint, signature0, address0));
        require(ecverify(fingerprint, signature1, address1));

        super.decrementBalance(address0, balance0);
        super.decrementBalance(address1, balance1);

        Channel memory channel = Channel(
            channelId,      // bytes32 channelId;
            address0,       // address address0;
            address1,       // address address1;
            
            true,           // bool open;
            true,           // bool funded;
            settlingPeriod, // uint16 settlingPeriod;
            0,              // uint16 settlingBlock;

            balance0,       // uint256 balance0;
            balance1,       // uint256 balance1;

            0               // uint16 sequenceNumber;
        );

        channels[channelId] = channel;
    }

    function updateBalances(
        bytes32 channelId,
        uint256 sequenceNumber,

        uint256 balance0,
        uint256 balance1,

        bytes signature0,
        bytes signature1
    ) channelExists(channelId)
      channelIsNotSettled(channelId)
      sequenceNumberIsHighest(channelId, sequenceNumber)
    {
        bytes32 fingerprint = sha3(
            "updateBalances",
            channelId,
            sequenceNumber,
            balance0,
            balance1
        );

        require(ecverify(fingerprint, signature0, channels[channelId].address0));
        require(ecverify(fingerprint, signature1, channels[channelId].address1));

        channels[channelId].balance0 = balance0;
        channels[channelId].balance1 = balance1;
        channels[channelId].sequenceNumber = sequenceNumber;
    }

    function updateBalancesHashlock(
        bytes32 channelId,
        uint256 sequenceNumber,

        uint256 balance0,
        uint256 balance1,

        bytes32 hashed,
        bytes preimage,

        bytes signature0,
        bytes signature1
    ) channelExists(channelId)
      channelIsNotSettled(channelId)
      sequenceNumberIsHighest(channelId, sequenceNumber)
    {
        bytes32 fingerprint = sha3(
            "updateBalancesHashlock",
            channelId,
            sequenceNumber,
            hashed,
            balance0,
            balance1
        );

        require(ecverify(fingerprint, signature0, channels[channelId].address0));
        require(ecverify(fingerprint, signature1, channels[channelId].address1));

        require(sha3(preimage) == hashed)

        channels[channelId].balance0 = balance0;
        channels[channelId].balance1 = balance1;
        channels[channelId].sequenceNumber = sequenceNumber;
    }

    function closeChannel (
        bytes32 channelId,
        bytes signature,
        address signer
    ) channelExists(channelId)
      channelIsOpen(channelId)
    {
        bytes32 fingerprint = sha3(
            "closeChannel",
            channelId
        );

        if (signer == channels[channelId].address0) {
            require(ecverify(fingerprint, signature, channels[channelId].address0));
        } else if (signer == channels[channelId].address1) {
            require(ecverify(fingerprint, signature, channels[channelId].address1));
        } else {
            throw;
        }

        channels[channelId].open = false;
        channels[channelId].settlingBlock = block.number + channels[channelId].settlingPeriod;
    }

    function withdraw(
        bytes32 channelId
    ) channelExists(channelId)
      channelIsSettled(channelId)
      channelIsFunded(channelId)
    {
        channels[channelId].funded = false;

        super.incrementBalance(address0, balance0);
        super.incrementBalance(address1, balance1);
    }
}
