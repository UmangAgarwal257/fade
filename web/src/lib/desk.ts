import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";

const file = path.join(process.cwd(), "..", "keys", "desk.json");

export function deskKeypair(): Keypair {
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) {
    const created = Keypair.generate();
    writeFileSync(file, JSON.stringify(Array.from(created.secretKey)));
    return created;
  }
  const secret = Uint8Array.from(JSON.parse(readFileSync(file, "utf8")) as number[]);
  return Keypair.fromSecretKey(secret);
}
