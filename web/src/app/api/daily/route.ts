import { NextResponse } from "next/server";
import { loadDailyChallenge } from "@/lib/daily-store";
import { toPublic, utcDayKey } from "@/lib/game";

export async function GET() {
  const challenge = await loadDailyChallenge();
  return NextResponse.json({
    day: challenge.day,
    prompt: challenge.hand.prompt,
    mode: challenge.hand.mode,
    cards: toPublic(challenge.hand),
    hash: challenge.hand.hash,
    seal: challenge.seal,
    desk: challenge.desk,
    leaderboard: challenge.scores.map((row) => ({
      wallet: row.wallet,
      points: row.points,
      signature: row.signature,
      at: row.at,
    })),
    utcReset: `${utcDayKey()}T00:00:00.000Z`,
  });
}
