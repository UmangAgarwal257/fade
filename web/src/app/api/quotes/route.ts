import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/catalogue";
import { jupiterPrices } from "@/lib/jupiter";

export async function GET() {
  const stocks = await loadCatalogue();
  const quotes = await jupiterPrices(stocks.map((stock) => stock.mint));
  return NextResponse.json(quotes);
}
