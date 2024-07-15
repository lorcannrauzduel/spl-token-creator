import {
	bundlrStorage,
	Metaplex,
	walletAdapterIdentity,
} from '@metaplex-foundation/js';
import { Connection, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';

const BASE_FOLDER = 'assets/';

export async function uploadSPLTokenMetadata(
	splTokenMetadataFileName: string,
	keypair: Keypair,
	rpc: string
) {
	try {
		console.log(`Upload des métadonnées...`);
		const connection = new Connection(rpc);
		const metaplex = new Metaplex(connection);

		let bundlrProvider = 'https://devnet.bundlr.network';

		if (rpc !== 'devnet' && rpc !== 'https://api.devnet.solana.com') {
			bundlrProvider = 'https://node1.bundlr.network';
		}

		metaplex.use(walletAdapterIdentity(keypair));
		metaplex.use(
			bundlrStorage({
				address: bundlrProvider,
				providerUrl: rpc,
				timeout: 60000,
				identity: keypair,
			})
		);

		const splTokenMetadata = JSON.parse(
			readFileSync(BASE_FOLDER + splTokenMetadataFileName, 'utf-8')
		);

		return await metaplex
			.nfts()
			.uploadMetadata({
				name: splTokenMetadata.name,
				symbol: splTokenMetadata.symbol,
				description: splTokenMetadata.description,
				image: splTokenMetadata.image,
			})
			.run();
	} catch (err) {
		console.log(err);
		return null;
	}
}
