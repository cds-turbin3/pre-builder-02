import { address, appendTransactionMessageInstructions, assertIsTransactionWithBlockhashLifetime, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, getSignatureFromTransaction, sendAndConfirmTransactionFactory, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from "@solana/kit";
import wallet from "../../devnet-wallet.json";
import { findAssociatedTokenPda, getCreateAssociatedTokenInstructionAsync, getMintToInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

const urlDevnet = "https://api.devnet.solana.com";
const wssDevnet = "wss://api.devnet.solana.com";

const rpc = createSolanaRpc(urlDevnet);
const rpcSubscriptions = createSolanaRpcSubscriptions(wssDevnet);
const mint = address("G29naZ3fRs31Be3jRSw7ssp4yedqTcbBeBqJzUP66vgh");
const token_decimals = 1_000_000n;

async function main() {
    try {

        const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
        const [ata] = await findAssociatedTokenPda({
            mint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
        });
        console.log("ATA: ${ata}");

        const createAtaTx = await getCreateAssociatedTokenInstructionAsync({
            payer: signer,
            mint,
            owner: signer.address
        });

        const mintToTx = await getMintToInstruction({
            mint,
            token: ata,
            mintAuthority: signer,
            amount: 1n * token_decimals
        });

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        const sendAndConfirm = sendAndConfirmTransactionFactory({
            rpc, rpcSubscriptions
        });

        const msg = createTransactionMessage({ version: 0 });
        const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
        const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

        const txMessage = appendTransactionMessageInstructions(
            [createAtaTx, mintToTx],
            msgWithLifetime
        );

        const signedTx = await signTransactionMessageWithSigners(txMessage);
        assertIsTransactionWithBlockhashLifetime(signedTx);
        const signature = getSignatureFromTransaction(signedTx);
        await sendAndConfirm(signedTx, { commitment: "confirmed" })

        console.log(`mint tx id: http://solscan.io/tx/${signature}?cluster=devnet`);

    } catch (error) {
        console.log(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("mint completed"));
}

