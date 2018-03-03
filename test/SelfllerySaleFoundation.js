/*jshint esversion: 6 */

let expectThrow = require('./helpers/expectThrow.js');
let SelflleryYouToken = artifacts.require('./SelflleryYouToken.sol');
let SelfllerySaleFoundation = artifacts.require('./SelfllerySaleFoundation.sol');

const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('SelfllerySaleFoundation', accounts => {
    const SALE_TOKENS_CENTS = 55e24;
    const SALE_SOFT_CAP_TOKENS = 10e18; // smaller for test
    const SALE_HARD_CAP_TOKENS = 55e18; // smaller for test
    const MINIMUM_PURCHASE_AMOUNT = 1e17;
    const TOKEN_PRICE_WEI = 1e15;
    const TOKEN_CENTS = 1e18;
    const BONUS_PERCENT = 5;

    let token;
    let ico;
    let startDate;
    let bonusEndDate;
    let endDate;

    function sendRequest(method, params = []) {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: new Date().getTime()
            }, (error, result) => error ? reject(error) : resolve(result.result));
        });
    }

    async function getLastTimestamp() {
        let blockNumber = await sendRequest('eth_blockNumber');
        let block = await sendRequest('eth_getBlockByNumber', [blockNumber, false]);
        return parseInt(block.timestamp, 16);
    }

    async function setBlockTime(time) {
        let lastTime = await getLastTimestamp();
        let increment = time - lastTime;
        if (increment <= 0) throw 'setBlockTime error';
        await sendRequest('evm_increaseTime', [increment]);
        await sendRequest('evm_mine', []);
    }

    function calcTotalTokensWithBonus(etherWei) {
        return calcTotalTokens(etherWei) * 1.05;
    }

    function calcTotalTokens(etherWei) {
        return (etherWei * TOKEN_CENTS / TOKEN_PRICE_WEI);
    }

    beforeEach(async () => {
        token = await SelflleryYouToken.new({from: accounts[0]});

        startDate = await getLastTimestamp() + 1000;
        bonusEndDate = startDate + 1500;
        endDate = startDate + 2000;

        ico = await SelfllerySaleFoundation.new(
            token.address,
            accounts[9],
            TOKEN_CENTS,
            TOKEN_PRICE_WEI,
            SALE_TOKENS_CENTS,
            startDate,
            bonusEndDate,
            endDate,
            SALE_HARD_CAP_TOKENS,
            MINIMUM_PURCHASE_AMOUNT,
            BONUS_PERCENT,
            {from: accounts[0]}
        );

        await token.approve(ico.address, SALE_TOKENS_CENTS, {from: accounts[0]});
    });

    it('should be correct initialization ICO', async () => {
        let hardCapTokens = await ico.hardCapTokens.call();
        hardCapTokens.should.be.bignumber.equal(SALE_HARD_CAP_TOKENS);

        let saleTokensCents = await ico.saleTokensCents.call();
        saleTokensCents.should.be.bignumber.equal(SALE_TOKENS_CENTS);

        assert.equal(await ico.token.call(), token.address);
        assert.equal(await ico.tokenPriceWei.call(), TOKEN_PRICE_WEI);
        assert.equal(await ico.minimumPurchaseAmount.call(), MINIMUM_PURCHASE_AMOUNT);
        assert.equal(await ico.startDate.call(), startDate);
        assert.equal(await ico.bonusEndDate.call(), bonusEndDate);
        assert.equal(await ico.endDate.call(), endDate);
    });

    it('shouldn\'t buy tokens before the start ICO', async () => {
        await setBlockTime(startDate - 10);
        await expectThrow(ico.sendTransaction({from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
        await expectThrow(ico.purchase({from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
        await expectThrow(ico.purchaseFor(accounts[1], {from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
    });

    it('should add a pre-sale result by owner before the start ICO', async () => {
        await setBlockTime(startDate - 5);
        let amountTokens = 1e18;
        await ico.addPreSalePurchaseTokens(accounts[7], amountTokens, {from: accounts[0]});

        let preSaleParticipantTokens = await ico.preSaleParticipantTokens.call(accounts[7]);
        preSaleParticipantTokens.should.be.bignumber.equal(amountTokens);

        let balanceOf = await token.balanceOf.call(accounts[7]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[7]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther = await ico.paidEther.call(accounts[7]);
        paidEther.should.be.bignumber.equal(0);
    });

    it('should buy tokens with the bonus on bonus time ICO', async () => {
        await setBlockTime(startDate + 10);
        let etherWei = 1e18;
        let amountTokens = calcTotalTokensWithBonus(etherWei);

        await ico.purchase({from: accounts[2], value: etherWei});

        let balanceOf = await token.balanceOf.call(accounts[2]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[2]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(etherWei);

        let paidEther = await ico.paidEther.call(accounts[2]);
        paidEther.should.be.bignumber.equal(etherWei);
    });

    it('shouldn\'t buy tokens less minimum purchase amount', async () => {
        await setBlockTime(startDate + 20);
        await expectThrow(ico.sendTransaction({from: accounts[3], value: TOKEN_PRICE_WEI}));
    });

    it('should buy tokens without bonus on time ICO for another user', async () => {
        await setBlockTime(bonusEndDate + 100);
        let etherWei = 1e18;
        let amountTokens = calcTotalTokens(1e18);

        await ico.purchaseFor(accounts[8], {from: accounts[3], value: etherWei});

        let balanceOf = await token.balanceOf.call(accounts[8]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[8]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(etherWei);

        let paidEther = await ico.paidEther.call(accounts[8]);
        paidEther.should.be.bignumber.equal(etherWei);
    });

    it('should buy tokens without bonus on time ICO for 2 another users', async () => {
        await setBlockTime(bonusEndDate + 100);
        let etherWei = 1e18;
        let amountTokens = calcTotalTokens(1e18);

        await ico.purchaseFor(accounts[8], {from: accounts[3], value: etherWei});

        await ico.purchaseFor(accounts[7], {from: accounts[3], value: etherWei * 2});

        let balanceOf1 = await token.balanceOf.call(accounts[8]);
        balanceOf1.should.be.bignumber.equal(amountTokens);

        let balanceOf2 = await token.balanceOf.call(accounts[7]);
        balanceOf2.should.be.bignumber.equal(amountTokens * 2);

        let sentTokens1 = await ico.sentTokens.call(accounts[8]);
        sentTokens1.should.be.bignumber.equal(amountTokens);

        let sentTokens2 = await ico.sentTokens.call(accounts[7]);
        sentTokens2.should.be.bignumber.equal(amountTokens * 2);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens * 3);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(etherWei * 3);

        let paidEther1 = await ico.paidEther.call(accounts[8]);
        paidEther1.should.be.bignumber.equal(etherWei);

        let paidEther2 = await ico.paidEther.call(accounts[7]);
        paidEther2.should.be.bignumber.equal(etherWei * 2);
    });

    it('should change and use the minimum purchase amount', async () => {
        await setBlockTime(bonusEndDate + 200);
        let anotherMinimumPurchaseAmount = 1e16;
        await ico.changeMinimumPurchaseAmount(anotherMinimumPurchaseAmount, {from: accounts[0]});

        let minimumPurchaseAmount = await ico.minimumPurchaseAmount.call();
        minimumPurchaseAmount.should.be.bignumber.equal(anotherMinimumPurchaseAmount);

        let amountTokens = calcTotalTokens(anotherMinimumPurchaseAmount);
        await ico.sendTransaction({from: accounts[5], value: anotherMinimumPurchaseAmount});

        let balanceOf = await token.balanceOf.call(accounts[5]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[5]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(anotherMinimumPurchaseAmount);

        let paidEther = await ico.paidEther.call(accounts[5]);
        paidEther.should.be.bignumber.equal(anotherMinimumPurchaseAmount);
    });

    it('should buy tokens with minimum purchase amount', async () => {
        await setBlockTime(bonusEndDate + 300);
        let etherWei = 1e17;
        let amountTokens = calcTotalTokens(etherWei);

        await ico.sendTransaction({from: accounts[4], value: etherWei});

        let balanceOf = await token.balanceOf.call(accounts[4]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[4]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(etherWei);

        let paidEther = await ico.paidEther.call(accounts[4]);
        paidEther.should.be.bignumber.equal(etherWei);
    });

    it('should show status the hard cap', async () => {
        await setBlockTime(bonusEndDate + 400);
        await ico.sendTransaction({from: accounts[0], value: 20e18});
        await ico.sendTransaction({from: accounts[3], value: 5e18});
        await ico.sendTransaction({from: accounts[4], value: 5e18});
        await ico.sendTransaction({from: accounts[5], value: 5e18});
        await ico.sendTransaction({from: accounts[6], value: 5e18});
        await ico.sendTransaction({from: accounts[7], value: 5e18});
        await ico.sendTransaction({from: accounts[8], value: 5e18});
        await ico.sendTransaction({from: accounts[2], value: 5e18});
        assert.isTrue(await ico.isHardCapTokensReached());
    });

    it('shouldn\'t change the minimum purchase amount by not owner', async () => {
        let minimumPurchaseAmountBeforeChange = await ico.minimumPurchaseAmount.call();
        let anotherMinimumPurchaseAmount = 1e16;

        await expectThrow(ico.changeMinimumPurchaseAmount(anotherMinimumPurchaseAmount, {from: accounts[5]}));
        await expectThrow(ico.sendTransaction({from: accounts[5], value: anotherMinimumPurchaseAmount}));

        let minimumPurchaseAmountAfterChange = await ico.minimumPurchaseAmount.call();
        minimumPurchaseAmountAfterChange.should.be.bignumber.equal(minimumPurchaseAmountBeforeChange);

        let balanceOf = await token.balanceOf.call(accounts[5]);
        balanceOf.should.be.bignumber.equal(0);

        let sentTokens = await ico.sentTokens.call(accounts[5]);
        sentTokens.should.be.bignumber.equal(0);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(0);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther = await ico.paidEther.call(accounts[5]);
        paidEther.should.be.bignumber.equal(0);
    });

    it('shouldn\'t add a pre-sale result by not owner', async () => {
        let amountTokens = 1e18;

        await expectThrow(ico.addPreSalePurchaseTokens(accounts[6], amountTokens, {from: accounts[1]}));

        let preSaleParticipantTokens = await ico.preSaleParticipantTokens.call(accounts[6]);
        preSaleParticipantTokens.should.be.bignumber.equal(0);

        let balanceOf = await token.balanceOf.call(accounts[6]);
        balanceOf.should.be.bignumber.equal(0);

        let sentTokens = await ico.sentTokens.call(accounts[6]);
        sentTokens.should.be.bignumber.equal(0);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(0);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther = await ico.paidEther.call(accounts[6]);
        paidEther.should.be.bignumber.equal(0);
    });

    it('should add a pre-sale result by owner', async () => {
        let amountTokens = 1e18;
        await ico.addPreSalePurchaseTokens(accounts[7], amountTokens, {from: accounts[0]});

        let preSaleParticipantTokens = await ico.preSaleParticipantTokens.call(accounts[7]);
        preSaleParticipantTokens.should.be.bignumber.equal(amountTokens);

        let balanceOf = await token.balanceOf.call(accounts[7]);
        balanceOf.should.be.bignumber.equal(amountTokens);

        let sentTokens = await ico.sentTokens.call(accounts[7]);
        sentTokens.should.be.bignumber.equal(amountTokens);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther = await ico.paidEther.call(accounts[7]);
        paidEther.should.be.bignumber.equal(0);
    });

    it('should add 2 pre-sale result by owner', async () => {
        let amountTokens = 1e18;
        await ico.addPreSalePurchaseTokens(accounts[7], amountTokens, {from: accounts[0]});
        await ico.addPreSalePurchaseTokens(accounts[8], amountTokens * 3, {from: accounts[0]});

        let preSaleParticipantTokens1 = await ico.preSaleParticipantTokens.call(accounts[7]);
        preSaleParticipantTokens1.should.be.bignumber.equal(amountTokens);

        let preSaleParticipantTokens2 = await ico.preSaleParticipantTokens.call(accounts[8]);
        preSaleParticipantTokens2.should.be.bignumber.equal(amountTokens * 3);

        let balanceOf1 = await token.balanceOf.call(accounts[7]);
        balanceOf1.should.be.bignumber.equal(amountTokens);

        let balanceOf2 = await token.balanceOf.call(accounts[8]);
        balanceOf2.should.be.bignumber.equal(amountTokens * 3);

        let sentTokens1 = await ico.sentTokens.call(accounts[7]);
        sentTokens1.should.be.bignumber.equal(amountTokens);

        let sentTokens2 = await ico.sentTokens.call(accounts[8]);
        sentTokens2.should.be.bignumber.equal(amountTokens * 3);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(amountTokens * 4);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther1 = await ico.paidEther.call(accounts[7]);
        paidEther1.should.be.bignumber.equal(0);

        let paidEther2 = await ico.paidEther.call(accounts[8]);
        paidEther2.should.be.bignumber.equal(0);
    });

    it('should add total supply from pre-sale and finish ICO', async () => {
        await ico.addPreSalePurchaseTokens(accounts[8], SALE_TOKENS_CENTS, {from: accounts[0]});

        let preSaleParticipantTokens = await ico.preSaleParticipantTokens.call(accounts[8]);
        preSaleParticipantTokens.should.be.bignumber.equal(SALE_TOKENS_CENTS);

        let balanceOf = await token.balanceOf.call(accounts[8]);
        balanceOf.should.be.bignumber.equal(SALE_TOKENS_CENTS);

        let sentTokens = await ico.sentTokens.call(accounts[8]);
        sentTokens.should.be.bignumber.equal(SALE_TOKENS_CENTS);

        let currentCapTokens = await ico.currentCapTokens.call();
        currentCapTokens.should.be.bignumber.equal(SALE_TOKENS_CENTS);

        let currentCapEther = await ico.currentCapEther.call();
        currentCapEther.should.be.bignumber.equal(0);

        let paidEther = await ico.paidEther.call(accounts[8]);
        paidEther.should.be.bignumber.equal(0);

        assert.isTrue(await ico.isHardCapTokensReached());
        assert.isTrue(await ico.isIcoFinished());
    });

    it('shouldn\'t buy tokens after the finish ICO', async () => {
        await setBlockTime(endDate + 10);
        await expectThrow(ico.sendTransaction({from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
        await expectThrow(ico.purchase({from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
        await expectThrow(ico.purchaseFor(accounts[1], {from: accounts[1], value: MINIMUM_PURCHASE_AMOUNT}));
    });

    it('should finish after the end date', async () => {
         await setBlockTime(endDate + 200);
        assert.isTrue(await ico.isFinishDateReached());
        assert.isTrue(await ico.isIcoFinished());
    });
});