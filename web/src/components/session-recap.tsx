"use client";

import { formatPremium } from "@/lib/format";

export type RoundLog = {
  round: number;
  points: number;
  deskPoints: number | null;
  symbol: string;
  premium: number;
  mode: "solo" | "versus";
};

type Props = {
  log: RoundLog[];
  total: number;
  onNewSession: () => void;
};

export function SessionRecap({ log, total, onNewSession }: Props) {
  const best = log.reduce<RoundLog | null>((top, row) => (!top || row.points > top.points ? row : top), null);

  return (
    <div className="rise round-sheet mt-5 border-primary/25 p-5">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Session complete</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{total} <span className="text-lg text-muted">pts</span></p>
      {best && (
        <p className="mt-1 text-sm text-muted">
          Best hand · {best.symbol} · +{best.points} · {formatPremium(best.premium)}
        </p>
      )}
      <ul className="mt-4 divide-y divide-line border-t border-line">
        {log.map((row) => (
          <li key={row.round} className="flex items-center justify-between gap-3 py-2 font-mono text-xs">
            <span className="text-muted">R{row.round}</span>
            <span className="truncate">{row.symbol}</span>
            <span>+{row.points}</span>
            {row.mode === "versus" && row.deskPoints !== null && (
              <span className="text-muted">desk {row.deskPoints}</span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onNewSession} className="press mt-5 min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
        New session
      </button>
    </div>
  );
}
