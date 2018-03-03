pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract SelflleryYouToken is StandardToken, Ownable {
    using SafeMath for uint256;

    uint256 constant TOKEN_TOTAL_SUPPLY = 85937500 * 1e18;
    string constant TOKEN_NAME = "YOU token";
    string constant TOKEN_SYMBOL = "YOU";
    uint8 constant TOKEN_DECIMALS = 18;

    // ERC22 compliance
    /// Token name
    string public name;
    /// Token symbol
    string public symbol;
    /// The number of digits after the decimal point
    uint8 public decimals;

    event Burn(uint256 amount);

    /**
     * @dev Initialize a new token smart contract. The contract is initially locked and owned by the creator.
     */
    function SelflleryYouToken() public Ownable() {
        totalSupply_ = TOKEN_TOTAL_SUPPLY;
        balances[msg.sender] = TOKEN_TOTAL_SUPPLY;
        name = TOKEN_NAME;
        symbol = TOKEN_SYMBOL;
        decimals = TOKEN_DECIMALS;
    }

    /**
     * @dev Burn tokens from owner's address
     * @param _amount The amount of tokens to be burnt
     */
    function burn(uint256 _amount) public onlyOwner {
        totalSupply_ = totalSupply_.sub(_amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);
        Burn(_amount);
    }
}