import type { Connection } from "@solana/web3.js";

const MAX_AGE_MS = 25_000;

type Cached = {
  blockhash: string;
  lastValidBlockHeight: number;
  at: number;
};

let cached: Cached | null = null;
let inflight: Promise<Cached> | null = null;

export function prefetchBlockhash(connection: Connection): void {
  if (cached && Date.now() - cached.at < MAX_AGE_MS) return;
  if (inflight) return;
  inflight = connection
    .getLatestBlockhash("confirmed")
    .then((value) => {
      cached = { ...value, at: Date.now() };
      inflight = null;
      return cached;
    })
    .catch(() => {
      inflight = null;
      throw new Error("blockhash");
    });
}

export async function freshBlockhash(connection: Connection): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  if (cached && Date.now() - cached.at < MAX_AGE_MS) {
    return { blockhash: cached.blockhash, lastValidBlockHeight: cached.lastValidBlockHeight };
  }
  if (inflight) {
    const value = await inflight;
    return { blockhash: value.blockhash, lastValidBlockHeight: value.lastValidBlockHeight };
  }
  const value = await connection.getLatestBlockhash("confirmed");
  cached = { ...value, at: Date.now() };
  return value;
}
