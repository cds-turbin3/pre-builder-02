import { appendTransactionMessageInstructions, assertIsTransactionWithBlockhashLifetime, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, generateKeyPairSigner, getSignatureFromTransaction, sendAndConfirmTransactionFactory, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from "@solana/kit";

import { getInitializeMintInstruction, getMintSize, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

import wallet from "../../devnet-wallet.json";

const urlDevnet = "https://api.devnet.solana.com";
const wssDevnet = "wss://api.devnet.solana.com";

const rpc = createSolanaRpc(urlDevnet);
const rpcSubscriptions = createSolanaRpcSubscriptions(wssDevnet);


async function main() {
    try {
        const signer = await createKeyPairSignerFromBytes(
            new Uint8Array(wallet)
        );

        const mint = await generateKeyPairSigner();
        const space = BigInt(getMintSize());
        const rent = await rpc.getMinimumBalanceForRentExemption(space).send();
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        const sendAndConfirm = sendAndConfirmTransactionFactory({
            rpc, rpcSubscriptions
        });

        const msg = createTransactionMessage({ version: 0 });
        const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
        const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

        const txMessage = appendTransactionMessageInstructions(
            [
                getCreateAccountInstruction({
                    payer: signer,
                    newAccount: mint,
                    lamports: rent,
                    space,
                    programAddress: TOKEN_PROGRAM_ADDRESS,
                }),

                getInitializeMintInstruction({
                    mint: mint.address,
                    decimals: 6,
                    mintAuthority: signer.address

                })

            ],
            msgWithLifetime
        );

        const signedTx = await signTransactionMessageWithSigners(txMessage);
        assertIsTransactionWithBlockhashLifetime(signedTx);

        const signature = getSignatureFromTransaction(signedTx);

        // processed | confirmed | finalized
        // TODO whats the implication of confirmed vs finalized?
        await sendAndConfirm(signedTx, { commitment: "confirmed"}); 

        console.log(`mint address: ${mint.address}. Transaction Signature: ${signature}`);

    } catch (error) {
        console.log(error);
    }
}

if (require.main == module) {
    main().then(() => console.log("fin"));
}


//
//  mint address: G29naZ3fRs31Be3jRSw7ssp4yedqTcbBeBqJzUP66vgh. 
//  Transaction Signature: K2vNGWJBSuseQWaT1aVAKVJKvxuwQbT8UK4urfZHcSYUrSz8Gqx6ydBoHMuEL6pHJYGQLg5HDzVdBNCTgE93EC6
// https://solscan.io/tx/K2vNGWJBSuseQWaT1aVAKVJKvxuwQbT8UK4urfZHcSYUrSz8Gqx6ydBoHMuEL6pHJYGQLg5HDzVdBNCTgE93EC6?cluster=devnet
//
