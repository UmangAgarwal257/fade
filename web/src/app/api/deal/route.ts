import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/catalogue";
import { dealHand, toPublic, type Mode, type Prompt } from "@/lib/game";
import { sealHand } from "@/lib/seal";
import { deskKeypair } from "@/lib/desk";

export async function POST(request: Request) {
  const body = (await request.json()) as { mode?: Mode; prompt?: Prompt; seen?: string[] };
  const mode = body.mode === "versus" ? "versus" : "solo";
  const prompt = body.prompt === "richest" ? "richest" : "cheapest";
  const hand = dealHand(await loadCatalogue(), body.seen ?? [], prompt, mode);
  return NextResponse.json({
    cards: toPublic(hand),
    prompt,
    mode,
    hash: hand.hash,
    seal: sealHand(hand),
    desk: deskKeypair().publicKey.toBase58(),
  });
}
