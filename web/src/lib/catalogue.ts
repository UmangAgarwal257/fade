import type { Stock } from "./game";

type ApiRow = {
  symbol: string;
  name: string;
  contract_address: string;
  image: string;
  description: string;
  markPrice: number;
  tokenPrice: number;
};

export async function loadCatalogue(): Promise<Stock[]> {
  const response = await fetch("https://prestocks.com/api/prestocks", { cache: "no-store" });
  if (!response.ok) throw new Error("PreStocks catalogue is unavailable");
  const rows = (await response.json()) as ApiRow[];
  return rows.map((row) => ({
    symbol: row.symbol,
    name: row.name.replace(" PreStocks", ""),
    mint: row.contract_address,
    image: row.image,
    blurb: row.description.split("\n")[0],
    markPrice: row.markPrice,
    tokenPrice: row.tokenPrice,
  }));
}
