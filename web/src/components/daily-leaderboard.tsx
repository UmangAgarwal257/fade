"use client";

import { truncateAddress } from "@/lib/format";

export type LeaderRow = {
  wallet: string;
  points: number;
  signature: string;
};

type Props = {
  day: string;
  rows: LeaderRow[];
  you?: string | null;
};

export function DailyLeaderboard({ day, rows, you }: Props) {
  return (
    <aside className="border border-line p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Daily board</p>
      <h2 className="mt-1 text-lg font-medium tracking-tight">{day} UTC</h2>
      <p className="mt-2 text-sm text-muted">One shared hand. Solo stake. Best score wins the day.</p>
      {rows.length === 0 ? (
        <p className="mt-6 font-mono text-xs text-muted">No scores yet. Be first.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {rows.slice(0, 12).map((row, index) => {
            const mine = you && row.wallet === you;
            return (
              <li
                key={row.wallet}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-mono text-xs ${mine ? "bg-primary/15 text-foreground" : "text-muted"}`}
              >
                <span className="tabular-nums text-foreground/80">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{truncateAddress(row.wallet, 4)}</span>
                <span className="tabular-nums font-medium text-foreground">{row.points} pt</span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
