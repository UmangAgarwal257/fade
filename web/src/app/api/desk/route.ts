import { NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { openSeal } from "@/lib/seal";
import { deskKeypair } from "@/lib/desk";
import { lockDeskIx } from "@/lib/chain";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export async function POST(request: Request) {
  const body = (await request.json()) as { seal?: string; player?: string; nonce?: string; fund?: boolean };
  const desk = deskKeypair();
  if (body.fund) {
    const sig = await connection.requestAirdrop(desk.publicKey, 1_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
    return NextResponse.json({ desk: desk.publicKey.toBase58(), signature: sig });
  }
  if (!body.seal || !body.player || !body.nonce) {
    return NextResponse.json({ error: "Missing round" }, { status: 400 });
  }
  const hand = openSeal(body.seal);
  if (hand.mode !== "versus") return NextResponse.json({ error: "Solo round" }, { status: 400 });
  const ix = lockDeskIx(desk.publicKey, new PublicKey(body.player), BigInt(body.nonce), hand.deskPick);
  const tx = new Transaction().add(ix);
  tx.feePayer = desk.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(desk);
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return NextResponse.json({
    signature,
    pick: hand.deskPick,
    reason: hand.deskReason,
    desk: desk.publicKey.toBase58(),
  });
}
