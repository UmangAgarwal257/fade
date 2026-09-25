import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/lib/game";

const programId = new PublicKey(PROGRAM_ID);

/** Anchor event layout after 8-byte discriminator: player (32) + nonce (8) + player_points (1). */
const ROUND_SETTLED_PLAYER_POINTS_OFFSET = 8 + 32 + 8;

function parseSoloPlayerPoints(logs: string[]): number | null {
  for (const line of logs) {
    if (!line.startsWith("Program data: ")) continue;
    const buf = Buffer.from(line.slice("Program data: ".length), "base64");
    if (buf.length <= ROUND_SETTLED_PLAYER_POINTS_OFFSET) continue;
    const points = buf[ROUND_SETTLED_PLAYER_POINTS_OFFSET];
    if (points <= 2) return points;
  }
  return null;
}

export async function verifySoloSettle(
  connection: Connection,
  wallet: string,
  signature: string,
): Promise<{ ok: true; points: number } | { ok: false; error: string }> {
  let player: PublicKey;
  try {
    player = new PublicKey(wallet);
  } catch {
    return { ok: false, error: "Invalid wallet" };
  }

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta || tx.meta.err) return { ok: false, error: "Transaction failed or not found" };

  const keys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  if (!keys.some((key) => key.equals(player))) {
    return { ok: false, error: "Wallet not in transaction" };
  }

  const logs = tx.meta.logMessages ?? [];
  const invoked = logs.some((line) => line.includes(`Program ${PROGRAM_ID} invoke`));
  if (!invoked) return { ok: false, error: "Fade program not invoked" };

  const settled = logs.some(
    (line) => line.includes("Instruction: SettleSolo") || line.includes("Instruction: Settle Solo"),
  );
  if (!settled) return { ok: false, error: "Not a solo settle" };

  const programSuccess = logs.some((line) => line.includes(`Program ${PROGRAM_ID} success`));
  if (!programSuccess) return { ok: false, error: "Program did not succeed" };

  const points = parseSoloPlayerPoints(logs);
  if (points === null) return { ok: false, error: "Could not read points from transaction" };

  return { ok: true, points };
}
