import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Token from '../contracts/Token.json';
import DepositAndMint from '../contracts/DepositAndMint.json';
import contractAddresses from '../contracts/contract-addresses.json';
import { NoWalletDetected } from './NoWalletDetected';
import { ConnectWallet } from './ConnectWallet';
import { TransactionErrorMessage } from './TransactionErrorMessage';
import { WaitingForTransactionMessage } from './WaitingForTransactionMessage';

const Token_CA = contractAddresses.Token;
const DepositAndMint_CA = contractAddresses.DepositAndMint;

export const Dapp = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState(null);
  const [txBeingSent, setTxBeingSent] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [depositedTokens, setDepositedTokens] = useState(0);
  const [erc721Balance, setErc721Balance] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        setError(
          'MetaMask is not installed. Please install it to use this app.',
        );
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const network = await provider.getNetwork();
        setNetwork(network);

        const signer = provider.getSigner();
        setSigner(signer);
        setUserAddress(await signer.getAddress());
      } catch (error) {
        setError(error.message);
      }
    };

    init();
  }, []);

  const getBalances = async () => {
    try {
      const token = new ethers.Contract(Token_CA, Token.abi, provider);
      const depositContract = new ethers.Contract(
        DepositAndMint_CA,
        DepositAndMint.abi,
        provider,
      );

      const [tokenBalance, depositedBalance, erc721Balance] = await Promise.all(
        [
          token.balanceOf(userAddress),
          depositContract.userDeposits(userAddress),
          depositContract.balanceOf(userAddress),
        ],
      );

      setTokenBalance(ethers.utils.formatUnits(tokenBalance, 18));
      setDepositedTokens(ethers.utils.formatUnits(depositedBalance, 18));
      setErc721Balance(Number.parseInt(erc721Balance.toString(), 10));
    } catch (error) {
      setError(error.message);
    }
  };

  const mintToken = async () => {
    try {
      const tokenContract = new ethers.Contract(Token_CA, Token.abi, signer);
      const tx = await tokenContract.mint(
        userAddress,
        ethers.utils.parseUnits('100000', 18),
        { gasLimit: 3000000 },
      );
      setTxBeingSent(tx.hash);
      await tx.wait();
      await getBalances();
    } catch (error) {
      setError(error.message);
    } finally {
      setTxBeingSent(null);
    }
  };

  const depositTokens = async (amount = '1000') => {
    try {
      const depositContract = new ethers.Contract(
        DepositAndMint_CA,
        DepositAndMint.abi,
        signer,
      );

      const tokenContract = new ethers.Contract(Token_CA, Token.abi, signer);

      console.log('Approving tokens...');
      const approveTx = await tokenContract.approve(
        DepositAndMint_CA,
        ethers.utils.parseUnits(amount.toString(), 18),
      );
      console.log('Tokens approved with tx:', approveTx.hash);
      await approveTx.wait();

      console.log('Depositing tokens...');
      const depositTx = await depositContract.deposit(
        ethers.utils.parseUnits(amount.toString(), 18),
      );
      setTxBeingSent(depositTx.hash);
      console.log('Tokens deposited with tx:', depositTx.hash);
      await depositTx.wait(); // Chờ giao dịch deposit được xác nhận

      await getBalances(); // Cập nhật lại số dư
    } catch (error) {
      setError(error.message);
      console.error('Error during deposit:', error);
    } finally {
      setTxBeingSent(null);
    }
  };

  useEffect(() => {
    if (userAddress) {
      getBalances();
    }
  }, [userAddress]);

  if (!provider) return <NoWalletDetected />;
  if (error) return <p>{error}</p>;
  if (!userAddress) return <ConnectWallet />;

  return (
    <div className="m-5">
      <h1 style={{ color: 'red' }}>Welcome {userAddress}</h1>
      <hr />
      <h2 className="row ml-1">
        MINT TOKEN ------ you have{' '}
        <p className="ml-3" style={{ color: 'red' }}>
          {tokenBalance}
        </p>
      </h2>
      <h1>Your Deposited Tokens: {depositedTokens}</h1>
      <h1>Your ERC721 Balance: {erc721Balance}</h1>

      {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}
      {error && <TransactionErrorMessage message={error} />}

      <button onClick={mintToken}>Mint 10k ERC20 Tokens</button>
      <button onClick={() => depositTokens(1000)}>Deposit 1000 Tokens</button>
    </div>
  );
};
