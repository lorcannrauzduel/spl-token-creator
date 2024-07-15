# SPL Token Creator

Ce projet vous montre comment créer un SPL token sur Solana, avec des métadonnées associées.

## Installation du projet

Avant de commencer, assurez-vous d'avoir configuré votre environnement de développement :

1. Clonez ce repository.

```bash
git clone git@github.com:lorcannrauzduel/spl-token-creator.git
```

2. Installez les dépendances

```bash
pnpm i
```

4. **Configurez votre fichier `.env` avec une clé privée valide.** Ce compte sera l'autorité de gestion. L'autorité de gestion est celui qui a le pouvoir de **contrôler et de gérer les actions liées au token**.

```bash
PRIVATE_KEY=
```

5. Modifiez les paramètres dans `config/token.ts` selon vos besoins (nombre de décimales, URI des métadonnées, etc.).

```bash
export  const  options  = {
	decimals: 9,
	disableFreeze: false,
	rpcUrl: 'https://api.devnet.solana.com', // https://api.mainnet-beta.solana.com for mainnet
	uploadMetadata: null,
	metadataFile: 'metadata.json',
	totalSupply: 1000000,
};
```

6. Mettez à jour le fichier `metadata.json` avec les informations de votre token. Assurez-vous que l'image est déjà uploadée.

```json
{
	"name": "My Token",
	"symbol": "MYTOKEN",
	"description": "My Token",
	"image": "https://fiverr-res.cloudinary.com/images/q_auto,f_auto/gigs/38577360/original/fe4a778310a86b3072d4f2d2c0b1ee38a4e2a3e7/do-a-spoderman-meme-avatar-of-you.png"
}
```

## Prérequis

Avant de lancer le projet, **assurez-vous d'avoir des Solana (SOL) sur le compte d'autorité de gestion**. Sur le Devnet, vous pouvez en obtenir gratuitement sur [faucet.solana.com](https://faucet.solana.com/).

## Lancer le script

Une fois, que vous avez configuré les métadonnées de votre token et que vous avez alimenté votre compte. Vous pouvez lancer le script de création du token avec la commande :

```bash
pnpm create-token
```

## Concepts clés

Il est essentiel de connaître quelques concepts clés spécifique à Solana pour bien comprendre le code.

- **Lamports** :
  Sur Solana, les **lamports** sont l'unité de mesure pour payer les frais de transaction. C'est comme les frais de gaz sur Ethereum.

- **Types de comptes** :

  1. **Mint/Freeze Authority** :

     - **Mint Authority** : C'est le compte qui a le pouvoir de créer de nouveaux tokens et de les détruire.
     - **Freeze Authority** : C'est le compte qui peut geler (mettre en pause) les transferts de tokens.

  2. **Token Account** :

     - C'est le compte principal qui représente votre token.
     - Il stocke des informations comme le nombre de décimales du token et l'autorité de gestion.

  3. **Metadata Account** :

     - Ce compte stocke des informations comme le nom, le symbole et l'URI du token. Il est essentiel pour identifier et décrire le token dans les applications et les échanges.

  4. **Associated Token Account (ATA)** :
     - Ce compte est associé à une adresse spécifique et permet de posséder et de transférer des tokens.

## Explication du code

### 1. Initialisation

- **Génération de la paire de clés** pour le Token Account
- **Calcul des lamports** nécessaires pour la création du token.

  ```typescript
  const mintKeypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  ```

### 2. Gestion des métadonnées

- **Upload des métadonnées** du token sur Arweave à l'aide de Metaplex. Metaplex est une bibliothèque qui permet de faciliter la gestion des métadonnées.

  ```typescript
  const res = await uploadSPLTokenMetadata(metadataURI, authorityKeypair, rpc);
  if (!res) {
  	console.log(
  		'Erreur pendant le téléchargement des métadonnées. Vérifiez votre URI et réessayez !'
  	);
  	process.exit(-1);
  }
  const verifiedURI = res.uri;
  ```

### 3. Création des instructions

- **Création d'une transaction qui regroupe plusieurs instructions** :

  - **La création du Token Account**.
  - **L'initialisation du token** avec ses paramètres (nombre de décimales, autorité de gestion, etc.).
  - **La création du Metadata Account**

  ```typescript
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
  ```

### 4. Exécution de la transaction

- **Envoi de la transaction** pour une exécution atomique.
  ```typescript
  try {
  	const txHash = await sendAndConfirmTransaction(connection, transaction, [
  		authorityKeypair,
  		mintKeypair,
  	]);
  	console.log(`Transaction réussie: ${txHash}`);
  } catch (err) {
  	console.log(`Une erreur est survenue lors de la création du token: ${err}`);
  }
  ```

### 5. Mint de la supply

- **Création d'un Associated Token Account (ATA)** pour le token.
- **Mint de la supply total** vers l'ATA.

  ```typescript
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
  	connection,
  	authorityKeypair,
  	mintKeypair.publicKey,
  	authorityKeypair.publicKey
  );
  const mintTxHash = await mintTo(
  	connection,
  	authorityKeypair,
  	mintKeypair.publicKey,
  	tokenAccount.address,
  	authorityKeypair.publicKey,
  	totalSupply * Math.pow(10, decimals)
  );
  console.log(`Mint réussie: ${mintTxHash}`);
  ```
