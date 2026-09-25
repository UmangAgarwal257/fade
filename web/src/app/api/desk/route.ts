import { NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { openSeal } from "@/lib/seal";
import { deskKeypair } from "@/lib/desk";
import { lockDeskIx } from "@/lib/chain";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export async function POST(request: Request) {
  const body = (await request.json()) as { seal?: string; player?: string; nonce?: string };
  const desk = deskKeypair();
  if (!body.seal || !body.player || !body.nonce) {
    return NextResponse.json({ error: "Missing round" }, { status: 400 });
  }
  const hand = openSeal(body.seal);
  if (hand.mode !== "versus") return NextResponse.json({ error: "Solo round" }, { status: 400 });
  const balance = await connection.getBalance(desk.publicKey);
  if (balance < 60_000_000) {
    return NextResponse.json(
      { error: `Desk ${desk.publicKey.toBase58()} needs devnet SOL for the 0.05 stake.` },
      { status: 400 },
    );
  }
  const ix = lockDeskIx(desk.publicKey, new PublicKey(body.player), BigInt(body.nonce), hand.deskPick);
  const tx = new Transaction().add(ix);
  tx.feePayer = desk.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(desk);
  let signature: string;
  try {
    signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Desk lock failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({
    signature,
    pick: hand.deskPick,
    reason: hand.deskReason,
    desk: desk.publicKey.toBase58(),
  });
}
