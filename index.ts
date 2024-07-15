import { Keypair } from '@solana/web3.js';
import base58 from 'bs58';
import { config } from 'dotenv';
import { createToken } from './modules/create-token';
import { options } from './config/token';
config();

const main = async () => {
	if (!process.env.PRIVATE_KEY) {
		throw new Error('PRIVATE_KEY is not set in the .env file');
	}
	const secretKey = base58.decode(process.env.PRIVATE_KEY);
	const keypair = Keypair.fromSecretKey(secretKey);
	const { decimals, disableFreeze, rpcUrl, totalSupply, metadataFile } =
		options;
	
	await createToken(
		decimals,
		disableFreeze || false,
		metadataFile,
		keypair,
		rpcUrl,
		totalSupply
	);
};

main();
