import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { recordDailyScore } from "@/lib/daily-store";
import { utcDayKey } from "@/lib/game";
import { verifySoloSettle } from "@/lib/verify-settle";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export async function POST(request: Request) {
  const body = (await request.json()) as {
    day?: string;
    wallet?: string;
    points?: number;
    signature?: string;
  };
  const day = body.day ?? utcDayKey();
  if (!body.wallet || body.points === undefined || !body.signature) {
    return NextResponse.json({ error: "Missing score" }, { status: 400 });
  }
  try {
    new PublicKey(body.wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  const verified = await verifySoloSettle(connection, body.wallet, body.signature);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }
  if (body.points !== verified.points) {
    return NextResponse.json({ error: "Points do not match settlement" }, { status: 400 });
  }

  try {
    const leaderboard = recordDailyScore(day, {
      wallet: body.wallet,
      points: verified.points,
      signature: body.signature,
      at: Date.now(),
    });
    return NextResponse.json({ leaderboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save score";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
