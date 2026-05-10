import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { Connection, SendTransactionError } from "@solana/web3.js";
import wallet from "../../devnet-wallet.json";
import {
    addPlugin,
} from '@metaplex-foundation/mpl-core'

const RPC_URL = "https://api.devnet.solana.com";
const umi = createUmi(RPC_URL);
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));
umi.use(mplCore());

async function main() {
    try {
        const asset = publicKey("A7tFTCdjYSzvFr88ue5Ny51MtDFwXUxCw5AsAdR13z7S");
        const txResult = await addPlugin(umi, {
            asset,
            plugin: {
                type: 'Autograph',
                signatures: [
                    {
                        address: umi.identity.publicKey,
                        message: 'Create a caption for this StrangeBrew Token!',
                    },
                ],
            }
        }).sendAndConfirm(umi)


        const [signature] = base58.deserialize(txResult.signature);
        console.log(`Signature Tx: ${signature}`);
        console.log(`Solscan: https://solscan.io/tx/${signature}?cluster=devnet`);
        console.log(`RPC Confirmation Tx Result: %O`, txResult.result);

    } catch (error) {
        if (error instanceof SendTransactionError) {
            const connection = new Connection(RPC_URL);
            const logs = await error.getLogs(connection);
            console.error("SendTransactionError:", error.message);
            console.error("Logs:", logs);
        } else {
            console.error(error);
        }
    }
}

if (require.main == module) {
    main().then(() => console.log("fin nft:registerAutograph"));
}
