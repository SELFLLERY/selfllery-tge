pragma solidity ^0.4.18;

import "./SelfllerySaleFoundation.sol";

contract SelfllerySale is SelfllerySaleFoundation {
    address constant TOKEN_ADDRESS = 0x0; // Token YOU
    address constant SELFLLERY_MANAGER_WALLET = 0xdABb398298192192e5d4Ed2f120Ff7Af312B06eb;// SELFLLERY PTE LTD
    uint constant TOKEN_CENTS = 1e18;
    uint constant TOKEN_PRICE_WEI = 1e15;
    uint constant SALE_TOKENS_CENTS = 55000000 * TOKEN_CENTS;
    uint constant SALE_HARD_CAP_TOKENS = 55000000 * TOKEN_CENTS;

    uint8 constant BONUS_PERCENT = 5;
    uint constant MINIMUM_PURCHASE_AMOUNT = 0.1 ether;

    uint constant SALE_START_DATE = 1520240400; // 05.03.2018 9:00 UTC
    uint constant SALE_BONUS_END_DATE = 1520413200; // 07.03.2018 9:00 UTC
    uint constant SALE_END_DATE = 1522144800; // 27.03.2018 10:00 UTC

    /**
     * @dev Initialize the ICO contract
    */
    function SelfllerySale()
        public
        SelfllerySaleFoundation(
            TOKEN_ADDRESS,
            SELFLLERY_MANAGER_WALLET,
            TOKEN_CENTS,
            TOKEN_PRICE_WEI,
            SALE_TOKENS_CENTS,
            SALE_START_DATE,
            SALE_BONUS_END_DATE,
            SALE_END_DATE,
            SALE_HARD_CAP_TOKENS,
            MINIMUM_PURCHASE_AMOUNT,
            BONUS_PERCENT
        ) {}
}