"use client";

import { useEffect, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/table")
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalogue unavailable");
        setRows((await response.json()) as Row[]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Catalogue unavailable"));
  }, []);

  return (
    <section>
      <h1 className="text-4xl font-semibold tracking-tight">All eight names</h1>
      <p className="mt-3 max-w-xl text-muted">
        Live mark versus token price. This board is the reference. The game hides it until you lock a pick.
      </p>
      {error && <p className="mt-4 text-danger">{error}</p>}
      {!rows && !error && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      )}
      {rows && (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <li key={row.mint} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
              <img src={row.image} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="font-mono text-xs text-muted">{row.symbol}</p>
              </div>
              <p className="font-mono text-sm">
                {(row.premium * 100).toFixed(1)}%
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
