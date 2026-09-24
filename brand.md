# Brand — Fade

_Status: applied_

Fade is a devnet game. You call which PreStock trades cheap or rich versus its mark. The pick is a Solana transaction.

## Mood

Playful and technical. A game that still looks like a trading desk.

## Palette

One accent. No purple glow.

| Token | Hex |
| --- | --- |
| background | `#10140f` |
| foreground | `#f3f0e6` |
| card | `#1a2118` |
| muted | `#8d9484` |
| primary | `#e7f27a` |
| primary-foreground | `#14180f` |
| line | `#2a3326` |
| danger | `#e15a3a` |

## Type

Geist for the interface. Geist Mono for prices, scores, and addresses. Wired in `web/src/app/layout.tsx`.

## Voice

Short sentences. Say premium, mark, and token price. Do not say the player owns the company. PreStocks track a private-company price through an SPV.

## Images

Each card uses the `image` URL from `https://prestocks.com/api/prestocks`. A missing logo is a broken-image gap, not an emoji.
