import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { openSeal } from "@/lib/seal";
import { pointsFor, premium, scalePrice, UNSET_DESK_PICK } from "@/lib/game";
import { readPicks, roundPda } from "@/lib/chain";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export async function POST(request: Request) {
  const body = (await request.json()) as {
    seal?: string;
    pick?: number;
    player?: string;
    nonce?: string;
    deskReason?: string;
  };
  if (!body.seal || body.pick === undefined) {
    return NextResponse.json({ error: "Missing reveal" }, { status: 400 });
  }
  const hand = openSeal(body.seal);
  const cards = hand.cards.map((card) => ({
    symbol: card.symbol,
    name: card.name,
    mint: card.mint,
    image: card.image,
    markPrice: card.markPrice,
    tokenPrice: card.tokenPrice,
    premium: premium(card),
    mark: scalePrice(card.markPrice).toString(),
    token: scalePrice(card.tokenPrice).toString(),
  }));

  let deskPick: number | null = hand.mode === "versus" ? null : hand.deskPick;
  let deskReason: string | null = hand.mode === "versus" ? null : hand.deskReason;

  if (hand.mode === "versus") {
    if (!body.player || !body.nonce) {
      return NextResponse.json({ error: "Missing round for versus reveal" }, { status: 400 });
    }
    const player = new PublicKey(body.player);
    const account = await connection.getAccountInfo(roundPda(player, BigInt(body.nonce)));
    if (!account) {
      return NextResponse.json({ error: "Round not found on devnet" }, { status: 400 });
    }
    const picks = readPicks(account.data);
    if (picks.desk === UNSET_DESK_PICK) {
      return NextResponse.json({ error: "Desk has not locked yet" }, { status: 400 });
    }
    deskPick = picks.desk;
    deskReason = body.deskReason?.trim() || null;
  }

  return NextResponse.json({
    cards,
    playerPoints: pointsFor(hand.prompt, body.pick, hand.cards),
    deskPoints: deskPick !== null ? pointsFor(hand.prompt, deskPick, hand.cards) : 0,
    deskPick,
    deskReason,
  });
}
