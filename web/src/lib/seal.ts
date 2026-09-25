import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Hand } from "./game";
import { dataRoot } from "./paths";

function secret(): string {
  const env = process.env.FADE_SEAL_SECRET;
  if (env) return env.trim();
  const dir = dataRoot();
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "seal");
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
