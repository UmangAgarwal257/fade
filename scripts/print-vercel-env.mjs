#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const deskFile = path.join(root, "keys", "desk.json");
const sealFile = path.join(root, "keys", "seal");

if (!existsSync(deskFile)) {
  console.error("Missing keys/desk.json — run the app locally once and deal a hand, or generate a keypair.");
  process.exit(1);
}

const desk = readFileSync(deskFile, "utf8").trim();
let seal = existsSync(sealFile) ? readFileSync(sealFile, "utf8").trim() : randomBytes(32).toString("hex");

console.log("Paste these in Vercel → Project → Settings → Environment Variables (Production + Preview):\n");
console.log(`FADE_DESK_SECRET_KEY=${desk}`);
console.log(`FADE_SEAL_SECRET=${seal}`);
console.log("\nDesk pubkey (fund on devnet for Versus):");
const { createRequire } = await import("module");
const require = createRequire(path.join(root, "web", "package.json"));
const { Keypair } = require("@solana/web3.js");
const secret = Uint8Array.from(JSON.parse(desk));
console.log(Keypair.fromSecretKey(secret).publicKey.toBase58());
