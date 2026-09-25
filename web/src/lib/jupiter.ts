type PriceRow = { usdPrice?: number };

export async function jupiterPrices(mints: string[]): Promise<Record<string, string>> {
  const key = process.env.JUPITER_API_KEY;
  if (!key || mints.length === 0) return {};
  const url = `https://api.jup.ag/price/v3?ids=${mints.join(",")}`;
  const response = await fetch(url, { headers: { "x-api-key": key }, cache: "no-store" });
  if (!response.ok) return {};
  const body = (await response.json()) as Record<string, PriceRow>;
  const quotes: Record<string, string> = {};
  for (const mint of mints) {
    const price = body[mint]?.usdPrice;
    if (!price || price <= 0) continue;
    const amount = 1 / price;
    const digits = amount >= 1 ? 4 : 6;
    quotes[mint] = amount.toLocaleString("en-US", { maximumFractionDigits: digits });
  }
  return quotes;
}
