import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58, createSignerFromKeypair, generateSigner, signerIdentity } from "@metaplex-foundation/umi";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import wallet from "../../devnet-wallet.json";


const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

// declare UMI capabilities
umi.use(signerIdentity(signer));
umi.use(mplCore());

async function main() {
    try {
        const metadataUri = "https://gateway.irys.xyz/Fz4CHtp9PcPSmhLCkXfQikfLgBi2Ld9oBVZ6de8giTiy";
        const asset = generateSigner(umi);
        const tx = await create(umi, {
            asset,
            name: "StrangeBrew",
            uri: metadataUri,
        }).sendAndConfirm(umi);

        const sig = base58.deserialize(tx.signature)[0];
        console.log(`Tx Signature: https://solscan.io/tx/${sig}?cluster=devnet`);
        console.log(`Asset Account: https://solscan.io/account/${asset.publicKey}?cluster=devnet`);
    } catch (error) {
        console.error(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("fin nft:mint"));
}
