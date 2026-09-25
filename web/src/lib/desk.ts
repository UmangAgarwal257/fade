import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import { dataRoot } from "./paths";

const file = () => path.join(dataRoot(), "desk.json");

export function deskKeypair(): Keypair {
  const env = process.env.FADE_DESK_SECRET_KEY;
  if (env) {
    const secret = Uint8Array.from(JSON.parse(env) as number[]);
    return Keypair.fromSecretKey(secret);
  }
  const pathFile = file();
  mkdirSync(path.dirname(pathFile), { recursive: true });
  if (!existsSync(pathFile)) {
    const created = Keypair.generate();
    writeFileSync(pathFile, JSON.stringify(Array.from(created.secretKey)));
    return created;
  }
  const secret = Uint8Array.from(JSON.parse(readFileSync(pathFile, "utf8")) as number[]);
  return Keypair.fromSecretKey(secret);
}
