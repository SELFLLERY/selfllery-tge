/*jshint esversion: 6 */

let expectThrow = require('./helpers/expectThrow.js');
let SelflleryYouToken = artifacts.require('./SelflleryYouToken.sol');

const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('SelflleryYouToken', accounts => {
    const totalSupply = 85937500 * 1e18;
    const tokenName = 'YOU token';
    const tokenSymbol = 'YOU';
    const tokenDecimals = 18;

    let token;

    beforeEach(async () => {
        token = await SelflleryYouToken.new({from: accounts[0]});
    });

    it('should be correct initialization token', async () => {
        assert.equal(totalSupply, await token.totalSupply.call());
        assert.equal(tokenName, await token.name.call());
        assert.equal(tokenSymbol, await token.symbol.call());
        assert.equal(tokenDecimals, await token.decimals.call());
        assert.equal(totalSupply, await token.balanceOf.call(accounts[0]));
        assert.equal(accounts[0], await token.owner.call());
    });

    it('should burn tokens only owner', async () => {
        const tokensToBurn = 100;
        await expectThrow(token.burn(tokensToBurn, {from: accounts[1]}));
        await token.burn(tokensToBurn, {from: accounts[0]});
        assert.equal(totalSupply - tokensToBurn, await token.balanceOf.call(accounts[0]));
        assert.equal(totalSupply - tokensToBurn, await token.totalSupply.call());
    });
});