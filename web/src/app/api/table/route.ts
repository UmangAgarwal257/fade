import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/catalogue";
import { premium } from "@/lib/game";

export async function GET() {
  const stocks = await loadCatalogue();
  return NextResponse.json(
    stocks
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        mint: stock.mint,
        image: stock.image,
        markPrice: stock.markPrice,
        tokenPrice: stock.tokenPrice,
        premium: premium(stock),
      }))
      .sort((a, b) => a.premium - b.premium),
  );
}
