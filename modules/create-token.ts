import { findMetadataPda } from '@metaplex-foundation/js';
import {
	createCreateMetadataAccountV3Instruction,
	DataV2,
} from '@metaplex-foundation/mpl-token-metadata';
import {
	createInitializeMint2Instruction,
	getMinimumBalanceForRentExemptMint,
	getOrCreateAssociatedTokenAccount,
	MINT_SIZE,
	mintTo,
	TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
	Connection,
	Keypair,
	PublicKey,
	sendAndConfirmTransaction,
	SystemProgram,
	Transaction,
} from '@solana/web3.js';
import { uploadSPLTokenMetadata } from '../helpers/upload-spl-token-metadata';

export async function createToken(
	decimals: number,
	disableFreeze: boolean,
	metadataURI: string,
	authorityKeypair: Keypair,
	rpc: string,
	totalSupply: number
) {
	// Connexion à Solana avec le RPC (mainnet, testnet, etc.)
	const connection = new Connection(rpc);

	// Génère une nouvelle paire de clés pour le token (mint)
	const mintKeypair = Keypair.generate();

	// Calcule le montant de lamports nécessaires pour créer un token account
	// Les lamports c'est l'équivalent des gas fees pour les transactions Solana
	const lamports = await getMinimumBalanceForRentExemptMint(connection);

	// Avant de créer le token
	// Vous devez préparer l'adresse PDA, ou "Program Derived Address"
	// Cette adresse PDA est utilisée pour stocker les données liées au token
	// Elle est calculée en fonction de la clé publique du token (mint) que vous avez générée localement.
	const metadataPDA = await findMetadataPda(
		new PublicKey(mintKeypair.publicKey)
	);

	// Upload des métadonnées sur Arweave avec Metaplex
	const res = await uploadSPLTokenMetadata(metadataURI, authorityKeypair, rpc);

	if (!res) {
		// Vérifie si le téléchargement des métadonnées a échoué
		console.log(
			`Erreur pendant le téléchargement des métadonnées. Vérifiez votre URI et réessayez!`
		);
		process.exit(-1); // Sortie du processus avec code d'erreur
	}

	const verifiedURI = res.uri;

	console.log(`Upload des métadonnées réussies: ${verifiedURI}`);
	// Récupère les métadonnées du fichier JSON
	const metadata: any = await (await fetch(verifiedURI)).json();

	const tokenMetadata = {
		name: metadata.name,
		symbol: metadata.symbol,
		uri: verifiedURI,
		sellerFeeBasisPoints: 0,
		creators: null,
		collection: null,
		uses: null,
	} as DataV2;

	// Crée l'instruction pour créer un metadata account
	// Un metadata account est un compte qui stocke les métadonnées associées à un token
	const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
		{
			metadata: metadataPDA,
			mint: mintKeypair.publicKey,
			mintAuthority: authorityKeypair.publicKey,
			payer: authorityKeypair.publicKey,
			updateAuthority: authorityKeypair.publicKey,
		},
		{
			createMetadataAccountArgsV3: {
				data: tokenMetadata,
				isMutable: false,
				collectionDetails: null,
			},
		}
	);

	// On regroupe les instructions dans une transaction
	// Ca permet de garantir une execution atomique
	// Ca veut dire que si une instruction parmi toutes ces instructions échoue, toutes les autres seront annulées
	const transaction = new Transaction().add(
		SystemProgram.createAccount({
			fromPubkey: authorityKeypair.publicKey,
			newAccountPubkey: mintKeypair.publicKey,
			space: MINT_SIZE,
			lamports: lamports,
			programId: TOKEN_PROGRAM_ID,
		}),
		createInitializeMint2Instruction(
			mintKeypair.publicKey,
			decimals,
			authorityKeypair.publicKey,
			disableFreeze ? null : authorityKeypair.publicKey,
			TOKEN_PROGRAM_ID
		),
		createMetadataInstruction
	);

	// Création du token
	try {
		console.log(`Création du token...`);
		// Envoie et confirme la transaction
		const txHash = await sendAndConfirmTransaction(connection, transaction, [
			authorityKeypair,
			mintKeypair,
		]);
		console.log(`Transaction réussie: ${txHash}`); // Affiche le hash de la transaction
		console.log(`Addresse du token: ${mintKeypair.publicKey}`);
	} catch (err) {
		console.log(`Une erreur est survenue lors de la création du token: ${err}`);
	}

	// Mint de la supply
	try {
		// On récupére ou crée un ATA (Associated Token Account) pour le token
		// Sans ATA, les tokens ne peuvent pas être transférés
		// Si l'ATA n'existe pas, il sera créé automatiquement
		const tokenAccount = await getOrCreateAssociatedTokenAccount(
			connection,
			authorityKeypair,
			mintKeypair.publicKey,
			authorityKeypair.publicKey
		);

		// On minte le token avec pour destination l'ATA
		console.log(`Mint de ${totalSupply} tokens...`);
		const mintTxHash = await mintTo(
			connection,
			authorityKeypair,
			mintKeypair.publicKey,
			tokenAccount.address,
			authorityKeypair.publicKey,
			totalSupply * Math.pow(10, decimals)
		);
		console.log(`Mint réussie: ${mintTxHash}`); // Affiche le hash de la transaction
	} catch (err) {
		console.log(`Une erreur est survenue lors du mint: ${err}`);
	}
}
