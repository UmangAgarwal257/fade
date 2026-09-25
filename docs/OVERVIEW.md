# Fade — what it does

> Call which PreStock is cheap or rich versus its mark.
> The pick is a devnet transaction, not a click.

This document covers what the proof of concept implements and which parts are real. For the program, see [ARCHITECTURE.md](ARCHITECTURE.md).

## In one minute

```
deal 4 of 8 PreStocks  →  hash the hidden prices
        →  player signs the pick on devnet
        →  versus: the desk signs its own pick
        →  settle checks the hash and writes points
```

A session is five rounds. The prompt alternates between cheapest versus mark and richest versus mark. Solo returns the 0.05 SOL stake. Versus, each side escrows 0.05 SOL and the higher score takes the pot. A tie returns both stakes.

You do not buy a PreStock to play. After settle, the screen can show a mainnet Jupiter quote for the mint you picked. That quote is not part of the round.

## Screens

### Play

Connect a devnet wallet, pick Solo or Versus, deal a hand. The four cards show the company, the logo from the PreStocks API, and a one-line description. Prices stay hidden until your lock transaction confirms.

### Table

All eight live names with mark, token price, and premium. This is the reference board. The game does not show it during a hand.

## Scoring

- 2 points for the extreme premium in the hand
- 1 point for the right side of zero when that is not the extreme
- 0 otherwise

Points land on a score account. A score does not exist until a round settles.

## The desk

One opponent. It never receives mark or token price. On a "richest" prompt it leans toward OpenAI, Anthropic, and SpaceX. On a "cheapest" prompt it fades those names. After both locks it shows the one-line reason for the rule that fired.

## What is real and what is not

| | |
| --- | --- |
| Devnet program, round accounts, picks, score account, SOL escrow | **real** |
| Premium math and the eight-mint allowlist | **real** |
| Prices | **live** PreStocks API, committed as a hash, not an on-chain oracle |
| PreStock token accounts | **not on devnet**, so the game never transfers them |
| Jupiter buy | **mainnet quote only** |
| Desk | **devnet keypair** with a fixed bias, not a model |
| Card network | **not part of this product** |

## Running it

```bash
# from the repo root, after the program is deployed to devnet
cd web
npm install
npm run dev
```

Fund the player wallet with devnet SOL before dealing. The desk key is created under `keys/` and is not committed. Fund that address before a versus round.

Program `86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm`.

Cluster: devnet. Explorer links on a settled round use `?cluster=devnet`.
