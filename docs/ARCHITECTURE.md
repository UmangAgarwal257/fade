# Fade — how it is built

For what the product does, see [OVERVIEW.md](OVERVIEW.md).

## Data flow

```
PreStocks API → deal 4 names → SHA-256 of mint:mark:token
             → open_round stores the hash and escrows 0.05 SOL
             → lock_pick records an index 0–3
             → lock_desk (versus only) escrows the desk's 0.05 SOL
             → settle recomputes the hash and pays the escrow
```

The browser never receives the prices until `lock_pick` has confirmed. The sealed hand is an HMAC the server opens at reveal time. The HMAC key and the desk keypair live in `keys/`, which is gitignored.

## Program

Anchor program `86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm` on devnet.

| Instruction | What it does |
| --- | --- |
| `open_round` | Creates the round PDA and the score PDA if needed. Stores four mainnet PreStocks mints, the prompt, the mode, and the price hash. Pulls 0.05 SOL from the player. |
| `lock_pick` | Player sets an index. Once. |
| `lock_desk` | Desk signer sets an index and escrows 0.05 SOL. Versus only. |
| `settle_solo` | Checks the hash, adds points, closes the round to the player so the stake and rent return. |
| `settle_versus` | Same check. Higher score takes both stakes. A tie returns each stake. Rent returns to the player. |

### Accounts

| Account | Seeds | Role |
| --- | --- | --- |
| Round | `["round", player, nonce]` | One hand. Closed on settle. |
| Score | `["score", player]` | Cumulative points and round count. |

The nonce is chosen by the client so a player can have many rounds.

### Price hash

Canonical string, four times, joined by `|`:

```
{mint_base58}:{mark_scaled}:{token_scaled}
```

Prices are `round(price * 1e8)` as integers. SHA-256 of the UTF-8 bytes must match on the client and in the program. Settle rejects a hand whose prices do not hash to the committed value, so the grader cannot swap in friendlier numbers after the pick.

### Allowlist

The four mints must be unique and must be one of the eight PreStocks mints hardcoded in the program. They are checked as pubkeys. The mint accounts do not need to exist on devnet.

### Payout

Native SOL. No USDC. Solo always returns the player's stake because the points are the result. Versus moves lamports to the desk before the round account closes, so a desk win does not also send the player's rent to the desk.

## Why the desk cannot see prices

`lock_desk` is signed by a server key. The pick function ranks symbols only: OpenAI, Anthropic, SpaceX, then the quieter names, inverted when the prompt is cheapest. The price fields are not arguments to that function.

## Web

Next.js app in `web/`. Wallet adapter talks to devnet. Instruction data is built in `web/src/lib/chain.ts` from the program IDL discriminators. Catalogue fetch is a server route so the browser does not depend on PreStocks CORS.

## Not built

A mainnet program, a Jupiter swap inside the round, a custom oracle, and a README. The quote route calls Jupiter only when `JUPITER_API_KEY` is set, and otherwise links to jup.ag.
