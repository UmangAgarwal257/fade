#!/usr/bin/env node
import { createHash } from "crypto";

const SCALE = 100_000_000;
const res = await fetch("https://prestocks.com/api/prestocks");
const rows = await res.json();
const cards = rows.slice(0, 4).map((row) => ({
  mint: row.contract_address,
  mark: Math.round(row.markPrice * SCALE),
  token: Math.round(row.tokenPrice * SCALE),
}));
const message = cards.map((c) => `${c.mint}:${c.mark}:${c.token}`).join("|");
const hash = createHash("sha256").update(message).digest("hex");
console.log("Fade demo hand");
console.log("symbols:", rows.slice(0, 4).map((r) => r.symbol).join(", "));
console.log("price hash:", hash);
console.log("program:", "86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm");
console.log("cluster: devnet");
console.log("Run the web app, airdrop SOL, deal a round, and open the settlement link on Play.");
