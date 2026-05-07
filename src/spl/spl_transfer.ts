import { address, appendTransactionMessageInstructions, assertIsTransactionWithBlockhashLifetime, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, getSignatureFromTransaction, sendAndConfirmTransactionFactory, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from "@solana/kit";
import wallet from "../../devnet-wallet.json"
import { findAssociatedTokenPda, getCreateAssociatedTokenInstructionAsync, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

const urlDevnet = "https://api.devnet.solana.com";
const wssDevnet = "wss://api.devnet.solana.com";

const rpc = createSolanaRpc(urlDevnet);
const rpcSubscriptions = createSolanaRpcSubscriptions(wssDevnet);
const mint = address("G29naZ3fRs31Be3jRSw7ssp4yedqTcbBeBqJzUP66vgh");
const toAddress = address("7yx3psxabVtrMnLM3L1HzKfVpLmg174aAhfzypRJLnpE");


async function main() {
    try {

        const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

        const sendAndConfirm = sendAndConfirmTransactionFactory({
            rpc, rpcSubscriptions
        });

        const [fromAta] = await findAssociatedTokenPda({
            mint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
        });
        console.log("From ATA: ${fromAta}");

        const [toAta] = await findAssociatedTokenPda({
            mint,
            owner: toAddress,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
        });
        console.log("To ATA: ${toAta}");

        const createAtaTx = await getCreateAssociatedTokenInstructionAsync({
            payer: signer,
            mint,
            owner: toAddress
        });

        const transferTx = getTransferCheckedInstruction({
            source: fromAta,
            mint,
            destination: toAta,
            authority: signer,
            amount: 500_000n,
            decimals: 6
        });

        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        const msg = createTransactionMessage({ version: 0 });
        const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
        const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

        const txMessage = appendTransactionMessageInstructions(
            [createAtaTx, transferTx],
            msgWithLifetime
        );

        const signedTx = await signTransactionMessageWithSigners(txMessage);
        assertIsTransactionWithBlockhashLifetime(signedTx);
        const signature = getSignatureFromTransaction(signedTx);
        await sendAndConfirm(signedTx, { commitment: "confirmed" })

        console.log(`transfer tx id: http://solscan.io/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("transfer completed")); }
