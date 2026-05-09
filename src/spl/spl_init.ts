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
        // Load existing wallet keypair from disk.
        //
        // This account (payor)
        // - pays transaction fees
        // - signs the transaction
        // - becomes the mint authority
        const signer = await createKeyPairSignerFromBytes(
            new Uint8Array(wallet)
        );

        // Generate NEW account keypair for the mint account itself.
        //
        // This account will become:
        // - a data account
        // - owned by the SPL Token Program
        // - containing mint metadata/state
        const mint = await generateKeyPairSigner();

        // bytes required for a Mint account.
        //
        // Solana accounts have fixed allocated sizes. 
        // TODO: don't understand how this functions
        const space = BigInt(getMintSize());

        // Calculate minimum lamports required for the account to become rent
        // exempt. TODO: What is rent? It seems refundable. Is this behavior
        // fixed in the protocol? Will it change?
        //
        // Mental model: prepaid permanent storage deposit
        const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

        // Fetch recent blockhash.
        //
        // Solana transaction expire quickly.
        // The blockhash acts like:
        // - freshness window as a tx has to be "bound" to a resent sequence of
        //   transactions
        // - could it be a replay protection?
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Create helper that:
        // - submits txn
        // - waits for confirmation
        // - tracks commitment level
        const sendAndConfirm = sendAndConfirmTransactionFactory({
            rpc, rpcSubscriptions
        });

        // Build transaction message progressively
        //
        // The Solana Kit API is intentionally explicit and immutable:
        // each transformation returns a new message.
        const msg = createTransactionMessage({ version: 0 });

        // Set fee payer
        const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

        // Attach transaction lifetime using recent blockhash
        const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

        // Append instructions to transaction.
        //
        // Instruction 1:
        //   System Program creates a new account
        //
        // Instruction 2:
        //   SPL Token Program initializes the account as a Mint account.
        //
        //   Creation and initialization are separate operations.
        const txMessage = appendTransactionMessageInstructions(
            [
                // System Program:
                // Allocate new account on-chain
                //
                // Result:
                // - account address exists
                // - funded with rent exemption
                // - owned by SPL Token Program
                // - data is still unitialized
                getCreateAccountInstruction({
                    payer: signer,
                    newAccount: mint,
                    lamports: rent,
                    space,

                    // Set the runtime owner of the new account. This means
                    // only the well known SPL Token Program may modify this
                    // account's data. 
                    //
                    // The payer wallet does NOT own the account!
                    programAddress: TOKEN_PROGRAM_ADDRESS,
                }),


                // SPL Token Program:
                // Initialize account data as a Mint. TODO: Define what is a Mint.
                //
                // Writes fields like:
                // - decimals
                // - mint authority
                // - supply
                // - initial flag
                getInitializeMintInstruction({
                    // The mint DATA account
                    mint: mint.address,

                    // UI precision
                    // 1 token = 1_000_000 base units
                    decimals: 6,

                    // Capability/authority field
                    //
                    // The Token Program stores this inisde the mint account
                    // data and later checks it during mint operations
                    //
                    // This is a capabilities model, not ownewrship.
                    mintAuthority: signer.address

                })

            ],
            msgWithLifetime
        );

        // Sign transaction with requried signers.
        //
        // Includes:
        // - payer wallet
        // - new mint account
        //
        // TODO: Does The mint account signs because new accounts mus authorize
        // thir own creation?
        const signedTx = await signTransactionMessageWithSigners(txMessage);
        assertIsTransactionWithBlockhashLifetime(signedTx);

        // Extract transaction signature/hash
        const signature = getSignatureFromTransaction(signedTx);

        // Submit transaction and wait for confirmation.
        //
        // Commitment levels:
        //
        // processed: 
        //  seen by leader node
        //
        // confirmed:
        //   voted on by cluster supermajority
        //
        // finalized:
        //   rooted/canonical chain state
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
