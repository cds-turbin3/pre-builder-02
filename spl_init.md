---
title: SPL init
---

Two relationships matter for the mint account in `src/spl/spl_init.ts`:
**ownership** (runtime: who can mutate the account's data) and
**authority** (capability: who the program checks before minting).
They are deliberately distinct in Solana's account model.

```mermaid
classDiagram
class Payer {
    +signs transactions
    +pays fees
    +publicKey
}

class SystemProgram {
    +creates accounts
    +allocates space
    +assigns runtime owner
    +funds rent exemption
}

class TokenProgram {
    +initializes mint accounts
    +checks authorities
    +mints tokens
    +mutates owned accounts
}

class MintAccount {
    +decimals
    +supply
    +mintAuthority: Pubkey
    +owner: TokenProgram
}

%% transaction flow
Payer ..> SystemProgram : invokes
Payer ..> TokenProgram : invokes

%% lifecycle
SystemProgram ..> MintAccount : creates + allocates + assigns owner

%% runtime ownership
TokenProgram --> MintAccount : runtime owner<br />(only program allowed to mutate data)

%% capability relationship
Payer ..> MintAccount : pubkey stored as<br />mintAuthority

%% authority enforcement
TokenProgram ..> MintAccount : checks mintAuthority<br />against transaction signer
```


