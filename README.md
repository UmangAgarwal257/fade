# Fade

> **Call which PreStock is cheap or rich versus its mark. The pick is a devnet transaction, not a click.**

Fade is a short game on Solana devnet. You get four names from the live [PreStocks](https://prestocks.com) catalogue, choose which trades **cheapest or richest versus its mark** before prices appear, and sign that choice on-chain. **Versus** pits you against the **Fade Desk** house; **Daily** is one shared hand per UTC day with a simple scoreboard.

**Live demo:** https://playfade.vercel.app

```
deal 4 PreStocks  →  hash committed prices
       →  player lock_pick on devnet
       →  versus: desk lock_desk + 0.05 SOL escrow each
       →  settle checks hash, scores premium, pays pot
```

## Quick start

```bash
git clone https://github.com/UmangAgarwal257/fade.git
cd fade/web
npm install
npm run dev
```

Open http://localhost:3000. Connect a **devnet** wallet and airdrop SOL. For **Versus**, fund the desk pubkey (created on first deal in `keys/desk.json`, gitignored).

Optional: `JUPITER_API_KEY` in `web/.env.local` for in-app quotes after settle; otherwise the UI links to [jup.ag](https://jup.ag).

Program is already on devnet (see below). To rebuild: `anchor build` and `anchor deploy --provider.cluster devnet`.

## Screens

| Screen | What it does |
| --- | --- |
| **Play** | Solo or Versus, five rounds. Cards show company, logo, blurb — not prices until your lock confirms. |
| **Table** | All eight PreStocks with mark, token price, and premium. Hidden during a hand. |
| **Daily** | One solo challenge per UTC day; scores verified against the settle transaction. |

## Scoring

Per round: **2** for the correct extreme premium, **1** for the right side of zero when that is not the extreme, **0** otherwise. Versus: **0.05 SOL** stake each side; higher session score wins the pot (`cancel_versus` refunds if the desk never locks).

## What is real, what is not

| Real | Mocked / off-chain |
| --- | --- |
| Devnet program, round + score PDAs, SOL escrow | Mainnet program |
| Eight-mint PreStocks allowlist + live API prices | On-chain price oracle |
| SHA-256 price hash checked at settle | PreStock SPL transfers on devnet |
| Jupiter quote or link after you pick | Swap inside the round |

## Documentation

- [docs/OVERVIEW.md](docs/OVERVIEW.md) — product flow and screens
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — program, seal, desk, daily store

## Deployed (devnet)

- Program [`86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm`](https://explorer.solana.com/address/86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm?cluster=devnet)
- PreStocks catalogue: https://prestocks.com/api/prestocks

Built for Stocklana.
