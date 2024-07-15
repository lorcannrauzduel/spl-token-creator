export const options = {
	decimals: 9, // Nombre de décimales du token
	disableFreeze: false, // Si vrai, ça veut dire que le Freeze Authority sera null, donc il n'y aura pas de possibilité de geler les comptes qui détiendront des tokens
	rpcUrl: 'https://api.devnet.solana.com', // https://api.mainnet-beta.solana.com pour le mainnet
	metadataFile: 'metadata.json', // Le nom du fichier JSON qui contient les métadonnées du token (dans le dossier /assets)
	totalSupply: 1000000, // Nombre total de tokens à créer
};
