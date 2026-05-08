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
        // TODO: assets using relative path is fragile
        const image = await readFile("./assets/nft/strange-brew.png");
        const file = createGenericFile(image, "images-cat.png", {
            contentType: "image/png"
        });

        const [myUri] = await umi.uploader.upload([file]);
        console.log(`Image: ${myUri}`);
    } catch (error) {
        console.error(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("fin nft:image"));
}
