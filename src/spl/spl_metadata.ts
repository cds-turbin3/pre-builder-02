import { createSignerFromKeypair, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import wallet from "../../devnet-wallet.json";
import { createMetadataAccountV3, CreateMetadataAccountV3InstructionAccounts, CreateMetadataAccountV3InstructionArgs, DataV2Args } from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";


// Prepare UMI context
const mint = publicKey("G29naZ3fRs31Be3jRSw7ssp4yedqTcbBeBqJzUP66vgh");
const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(signer));

async function main() {
    try {
        const accounts: CreateMetadataAccountV3InstructionAccounts = {
            mint,
            mintAuthority: signer
        };

        const data: DataV2Args = {
            name: "kata koin",
            symbol: "Katha",
            uri: "https://www.youtube.com/watch?v=F38ZRgp_N6k",
            sellerFeeBasisPoints: 1,
            creators: null,
            collection: null,
            uses: null,
        };

        const args: CreateMetadataAccountV3InstructionArgs = {
            data,
            isMutable: true,
            collectionDetails: null
        };

        const tx = createMetadataAccountV3(umi, {
            ...accounts,
            ...args

        });

        const result = await tx.sendAndConfirm(umi);
        console.log(bs58.encode(Buffer.from(result.signature)));

    } catch (error) {
        console.error(error);
    }

}


if (require.main == module) {
    main().then(() => console.log("fin"));
}


// 2sEXhGvXQgddKGMRqiy29rii1q7HkosV624rB2xuMScqyqF2jSsRnY6x8JEuVKDapXqzF2RSTaVzWUskCutmLTw6
// https://solscan.io/tx/2sEXhGvXQgddKGMRqiy29rii1q7HkosV624rB2xuMScqyqF2jSsRnY6x8JEuVKDapXqzF2RSTaVzWUskCutmLTw6?cluster=devnet
