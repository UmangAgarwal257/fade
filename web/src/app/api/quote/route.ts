import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const mint = new URL(request.url).searchParams.get("mint");
  if (!mint) return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  const link = `https://jup.ag/swap/USDC-${mint}`;
  const key = process.env.JUPITER_API_KEY;
  if (!key) return NextResponse.json({ link, quote: null });
  const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const url = `https://api.jup.ag/swap/v2/order?inputMint=${usdc}&outputMint=${mint}&amount=1000000`;
  const response = await fetch(url, { headers: { "x-api-key": key } });
  if (!response.ok) return NextResponse.json({ link, quote: null });
  const body = (await response.json()) as { outAmount?: string };
  return NextResponse.json({ link, quote: body.outAmount ?? null });
}
