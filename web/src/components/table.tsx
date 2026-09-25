"use client";

import { useEffect, useState } from "react";
import { formatPremium, formatUsd, jupBuyLink } from "@/lib/format";

type Row = {
  symbol: string;
  name: string;
  mint: string;
  image: string;
  markPrice: number;
  tokenPrice: number;
  premium: number;
};

export function Table() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [quotesReady, setQuotesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancel = false;
    setRows(null);
    setQuotes({});
    setQuotesReady(false);
    setError(null);
    fetch("/api/table")
      .then(async (response) => {
        if (!response.ok) throw new Error("The PreStocks board is unavailable.");
        const next = (await response.json()) as Row[];
        if (!cancel) setRows(next);
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "The PreStocks board is unavailable.");
      });
    fetch("/api/quotes")
      .then(async (response) => {
        if (!response.ok) return;
        const next = (await response.json()) as Record<string, string>;
        if (!cancel) setQuotes(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancel) setQuotesReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [attempt]);

  return (
    <section>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Mainnet reference</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">The eight names</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        Mark, token price, and premium. Buy opens that name on Jupiter, set to buy the PreStock. The game hides this board until a pick lands.
      </p>

      {error && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="press mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Try the board again
          </button>
        </div>
      )}

      {!rows && !error && (
        <div className="mt-8 space-y-3" aria-hidden>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[4.5rem] animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && (
        <p className="mt-8 border-t border-line pt-6 text-muted">PreStocks returned an empty catalogue.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))_auto] gap-4 border-b border-line px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-muted md:grid">
            <span>Name</span>
            <span className="text-right">Mark</span>
            <span className="text-right">Token</span>
            <span className="text-right">Premium</span>
            <span className="w-28 text-right">Buy</span>
          </div>
          <ul>
            {rows.map((row, index) => {
              return (
                <li
                  key={row.mint}
                  className="rise border-b border-line px-4 py-4 last:border-b-0"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))_auto]">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={row.image} alt="" className="h-10 w-10 shrink-0 rounded-full bg-background object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="font-mono text-xs text-muted">{row.symbol}</p>
                        <p className="mt-1 font-mono text-xs text-muted tabular-nums">
                          {quotes[row.mint] ? (
                            <span className="rise">1 USDC ≈ {quotes[row.mint]} {row.symbol}</span>
                          ) : quotesReady ? (
                            "Quote unavailable"
                          ) : (
                            <span className="inline-block h-3 w-28 animate-pulse rounded-full bg-line align-middle" />
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-sm tabular-nums md:text-right">
                      <span className="text-muted md:hidden">Mark </span>${formatUsd(row.markPrice)}
                    </p>
                    <p className="font-mono text-sm tabular-nums md:text-right">
                      <span className="text-muted md:hidden">Token </span>${formatUsd(row.tokenPrice)}
                    </p>
                    <p
                      className={`font-mono text-sm tabular-nums md:text-right ${row.premium < 0 ? "text-primary" : row.premium > 0 ? "text-danger" : "text-muted"}`}
                    >
                      <span className="text-muted md:hidden">Premium </span>
                      {formatPremium(row.premium)}
                    </p>
                    <a
                      href={jupBuyLink(row.mint)}
                      target="_blank"
                      rel="noreferrer"
                      className="press inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground md:w-28"
                    >
                      Buy
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
