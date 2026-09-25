export function jupBuyLink(mint: string): string {
  return `https://jup.ag/tokens/${mint}`;
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPremium(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function tokensFromUsdcQuote(outAmount: string, tokenPrice: number): string | null {
  const raw = Number(outAmount);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  let decimals = 9;
  if (tokenPrice > 0) {
    const guessed = Math.round(Math.log10(raw * tokenPrice));
    if (Number.isFinite(guessed) && guessed >= 0 && guessed <= 12) decimals = guessed;
  }
  const amount = raw / 10 ** decimals;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const digits = amount >= 1000 ? 2 : amount >= 1 ? 4 : 6;
  return amount.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
