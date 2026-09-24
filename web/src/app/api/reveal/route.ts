import { NextResponse } from "next/server";
import { openSeal } from "@/lib/seal";
import { pointsFor, premium, scalePrice } from "@/lib/game";

export async function POST(request: Request) {
  const body = (await request.json()) as { seal?: string; pick?: number };
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
  return NextResponse.json({
    cards,
    playerPoints: pointsFor(hand.prompt, body.pick, hand.cards),
    deskPoints: hand.mode === "versus" ? pointsFor(hand.prompt, hand.deskPick, hand.cards) : 0,
    deskPick: hand.mode === "versus" ? hand.deskPick : null,
    deskReason: hand.mode === "versus" ? hand.deskReason : null,
  });
}
