const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function main() {
  if (network.name === 'hardhat') {
    console.warn(
      'You are trying to deploy a contract to the Hardhat Network, which' +
        'gets automatically created and destroyed every time. Use the Hardhat' +
        " option '--network localhost'",
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    'Deploying the contracts with the account:',
    await deployer.getAddress(),
  );

  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance));

  if (balance.lt(ethers.utils.parseEther('0.1'))) {
    throw new Error('Not enough balance to deploy the contract');
  }

  // Deploy Token contract
  const Token = await ethers.getContractFactory('Token');
  const initialOwner = process.env.OWNER_ADDRESS;
  const token = await Token.deploy(initialOwner);
  await token.deployed();

  console.log('Token address:', token.address);

  // Deploy DepositAndMint contract
  const DepositAndMint = await ethers.getContractFactory('DepositAndMint');
  const depositAndMint = await DepositAndMint.deploy(token.address);
  await depositAndMint.deployed();

  console.log('DepositAndMint address:', depositAndMint.address);

  // Save contract addresses and ABI to the frontend
  saveFrontendFiles(token, depositAndMint);
}

function saveFrontendFiles(token, depositAndMint) {
  const contractsDir = path.join(
    __dirname,
    '..',
    'frontend',
    'src',
    'contracts',
  );

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // File paths
  const addressesPath = path.join(contractsDir, 'contract-addresses.json');
  const tokenPath = path.join(contractsDir, 'Token.json');
  const depositAndMintPath = path.join(contractsDir, 'DepositAndMint.json');

  // Check if files exist and remove them
  [addressesPath, tokenPath, depositAndMintPath].forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Remove existing file
    }
  });

  // Write the contract addresses to a JSON file
  const addressData = {
    Token: token.address,
    DepositAndMint: depositAndMint.address,
  };

  fs.writeFileSync(addressesPath, JSON.stringify(addressData, undefined, 2));

  // Write the ABI to separate JSON files
  const TokenArtifact = artifacts.readArtifactSync('Token');
  const DepositAndMintArtifact = artifacts.readArtifactSync('DepositAndMint');

  fs.writeFileSync(tokenPath, JSON.stringify(TokenArtifact, null, 2));

  fs.writeFileSync(
    depositAndMintPath,
    JSON.stringify(DepositAndMintArtifact, null, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
