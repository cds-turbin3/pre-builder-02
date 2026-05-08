import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { readFile } from "fs/promises";


const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader({ address: "https://devnet.irys.xyz" }));
umi.use(signerIdentity(signer));

async function main() {
    try {
        const image = "https://gateway.irys.xyz/CY68pPxTmnRuaDDDeKpD6A6bSxXEGTCqUX2D78vJhFzg";
        const metadata = {
            name: "StrangeBrew",
            description: "What's inside of you?",
            image,
            attributes: [{ trait_type: "Rarity", value: "Legeneary" }],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image,
                    },
                ],
                category: "image"
            },
        };

        const myUri = await umi.uploader.uploadJson(metadata);
        console.log(`Metadata: ${myUri}`);
    } catch (error) {
        console.error(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("fin nft:metadata"));
}
// https://gateway.irys.xyz/Fz4CHtp9PcPSmhLCkXfQikfLgBi2Ld9oBVZ6de8giTiy
