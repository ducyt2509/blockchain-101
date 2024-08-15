// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DepositAndMint is ERC721 {
    uint256 private _tokenIds;
    IERC20 public immutable tokenContract;
    mapping(address => uint256) public userDeposits;
    uint256 public constant THRESHOLD = 1000;

    constructor(address _tokenContract) ERC721("MyNFT", "MNFT") {
        require(_tokenContract != address(0), "Invalid token contract address");
        tokenContract = IERC20(_tokenContract);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        uint256 balance = tokenContract.balanceOf(msg.sender);
        require(balance >= amount, "Insufficient balance");

        uint256 allowance = tokenContract.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance");

        require(
            tokenContract.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        uint256 newDeposit = userDeposits[msg.sender] + amount;
        userDeposits[msg.sender] = newDeposit;

        if (newDeposit >= THRESHOLD) {
            _mintNFT(msg.sender);
            userDeposits[msg.sender] = newDeposit - THRESHOLD;
        }
    }

    function _mintNFT(address recipient) internal {
        _safeMint(recipient, _tokenIds);
        _tokenIds++;
    }

    function getContractTokenBalance() external view returns (uint256) {
        return tokenContract.balanceOf(address(this));
    }
}
