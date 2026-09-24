import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Hand } from "./game";

const keysDir = path.join(process.cwd(), "..", "keys");

function secret(): string {
  mkdirSync(keysDir, { recursive: true });
  const file = path.join(keysDir, "seal");
  if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString("hex"));
  return readFileSync(file, "utf8").trim();
}

export function sealHand(hand: Hand): string {
  const body = Buffer.from(JSON.stringify(hand)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function openSeal(token: string): Hand {
  const [body, mac] = token.split(".");
  if (!body || !mac) throw new Error("Bad seal");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad seal");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Hand;
}
