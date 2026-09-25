import { NextResponse } from "next/server";
import { jupBuyLink } from "@/lib/format";
import { jupiterPrices } from "@/lib/jupiter";

export async function GET(request: Request) {
  const mint = new URL(request.url).searchParams.get("mint");
  if (!mint) return NextResponse.json({ error: "Missing mint" }, { status: 400 });
  const quotes = await jupiterPrices([mint]);
  return NextResponse.json({ link: jupBuyLink(mint), quote: quotes[mint] ?? null });
}
