import { sha256 } from "@noble/hashes/sha2.js";

export const PROGRAM_ID = "86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm";
export const STAKE_SOL = 0.05;
export const SCALE = 100_000_000;

export type Prompt = "cheapest" | "richest";
export type Mode = "solo" | "versus";

export type Stock = {
  symbol: string;
  name: string;
  mint: string;
  image: string;
  blurb: string;
  markPrice: number;
  tokenPrice: number;
};

export type PublicCard = {
  symbol: string;
  name: string;
  mint: string;
  image: string;
  blurb: string;
};

export type Hand = {
  cards: Stock[];
  prompt: Prompt;
  mode: Mode;
  hash: number[];
  deskPick: number;
  deskReason: string;
};

const LOUD = ["OPENAI", "ANTHROPIC", "SPACEX"];
const QUIET = ["ANDURIL", "NEURALINK", "KALSHI", "POLYMARKET", "FIGUREAI"];

export function scalePrice(price: number): bigint {
  return BigInt(Math.round(price * SCALE));
}

export function priceMessage(cards: Stock[]): string {
  return cards
    .map((card) => `${card.mint}:${scalePrice(card.markPrice)}:${scalePrice(card.tokenPrice)}`)
    .join("|");
}

export function hashHand(cards: Stock[]): number[] {
  const bytes = new TextEncoder().encode(priceMessage(cards));
  return Array.from(sha256(bytes));
}

export function premium(card: Stock): number {
  return (card.tokenPrice - card.markPrice) / card.markPrice;
}

export function pointsFor(prompt: Prompt, pick: number, cards: Stock[]): number {
  const extreme = cards.reduce((best, card, index) => {
    const better =
      prompt === "cheapest" ? premium(card) < premium(cards[best]) : premium(card) > premium(cards[best]);
    return better ? index : best;
  }, 0);
  if (premium(cards[pick]) === premium(cards[extreme])) return 2;
  const right =
    prompt === "cheapest"
      ? cards[pick].tokenPrice < cards[pick].markPrice
      : cards[pick].tokenPrice > cards[pick].markPrice;
  return right ? 1 : 0;
}

export function deskChoice(symbols: string[], prompt: Prompt): { index: number; reason: string } {
  const ranked = prompt === "richest" ? [...LOUD, ...QUIET] : [...[...QUIET].reverse(), ...[...LOUD].reverse()];
  const symbol = ranked.find((item) => symbols.includes(item)) ?? symbols[0];
  const index = symbols.indexOf(symbol);
  const reason =
    prompt === "richest"
      ? `Leaning ${symbol}. Famous names trade rich.`
      : `Fading the obvious name. Taking ${symbol}.`;
  return { index, reason };
}

export function dealHand(stocks: Stock[], seen: string[], prompt: Prompt, mode: Mode): Hand {
  const unseen = stocks.filter((stock) => !seen.includes(stock.symbol));
  const pool = unseen.length >= 4 ? unseen : stocks;
  const cards = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
  while (cards.length < 4) {
    const extra = stocks.find((stock) => !cards.some((card) => card.mint === stock.mint));
    if (!extra) break;
    cards.push(extra);
  }
  const symbols = cards.map((card) => card.symbol);
  const desk = deskChoice(symbols, prompt);
  return {
    cards,
    prompt,
    mode,
    hash: hashHand(cards),
    deskPick: desk.index,
    deskReason: desk.reason,
  };
}

export function toPublic(hand: Hand): PublicCard[] {
  return hand.cards.map(({ symbol, name, mint, image, blurb }) => ({
    symbol,
    name,
    mint,
    image,
    blurb,
  }));
}

export function promptLabel(prompt: Prompt): string {
  return prompt === "cheapest" ? "Which token is cheapest versus its mark?" : "Which token is richest versus its mark?";
}
