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

function premiumCmp(markA: bigint, tokenA: bigint, markB: bigint, tokenB: bigint): number {
  const left = (tokenA - markA) * markB;
  const right = (tokenB - markB) * markA;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Matches on-chain `points_for` (integer marks/tokens). */
export function pointsForScaled(prompt: Prompt, pick: number, marks: bigint[], tokens: bigint[]): number {
  let best = 0;
  for (let i = 1; i < 4; i++) {
    const ord = premiumCmp(marks[i], tokens[i], marks[best], tokens[best]);
    const better = prompt === "cheapest" ? ord < 0 : ord > 0;
    if (better) best = i;
  }
  if (premiumCmp(marks[pick], tokens[pick], marks[best], tokens[best]) === 0) return 2;
  const right =
    prompt === "cheapest" ? tokens[pick] < marks[pick] : tokens[pick] > marks[pick];
  return right ? 1 : 0;
}

export function pointsFor(prompt: Prompt, pick: number, cards: Stock[]): number {
  const marks = cards.map((card) => scalePrice(card.markPrice));
  const tokens = cards.map((card) => scalePrice(card.tokenPrice));
  return pointsForScaled(prompt, pick, marks, tokens);
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

function dayRng(dayKey: string): () => number {
  const hash = sha256(new TextEncoder().encode(`fade-daily-v1:${dayKey}`));
  let i = 0;
  return () => {
    const a = hash[i % hash.length];
    const b = hash[(i + 1) % hash.length];
    i += 2;
    return ((a << 8) | b) / 65535;
  };
}

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailyPrompt(dayKey: string): Prompt {
  const hash = sha256(new TextEncoder().encode(`fade-daily-prompt:${dayKey}`));
  return hash[0] % 2 === 0 ? "cheapest" : "richest";
}

/** Same four names and price snapshot for everyone on a UTC calendar day. */
export function dealDaily(stocks: Stock[], dayKey: string): Hand {
  const prompt = dailyPrompt(dayKey);
  const rnd = dayRng(dayKey);
  const shuffled = [...stocks].sort(() => rnd() - 0.5);
  const cards = shuffled.slice(0, 4);
  const symbols = cards.map((card) => card.symbol);
  const desk = deskChoice(symbols, prompt);
  return {
    cards,
    prompt,
    mode: "solo",
    hash: hashHand(cards),
    deskPick: desk.index,
    deskReason: desk.reason,
  };
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
