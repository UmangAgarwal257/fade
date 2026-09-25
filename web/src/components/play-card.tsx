"use client";

import { formatPremium, formatUsd } from "@/lib/format";
import type { PublicCard } from "@/lib/game";

export type RevealCard = PublicCard & {
  markPrice: number;
  tokenPrice: number;
  premium: number;
  mark: string;
  token: string;
};

type Props = {
  card: PublicCard;
  index: number;
  revealed: RevealCard | null;
  flipped: boolean;
  yours: boolean;
  desk: boolean;
  winner: boolean;
  disabled: boolean;
  onPick: () => void;
};

export function PlayCard({ card, revealed, flipped, yours, desk, winner, disabled, onPick, index }: Props) {
  const premium = revealed?.premium;
  const rich = premium !== undefined && premium > 0;
  const cheap = premium !== undefined && premium < 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`card-scene rise press min-h-[11rem] w-full text-left disabled:cursor-default ${yours ? "card-yours" : ""}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={`card-inner ${flipped ? "card-flipped" : ""}`}>
        <div className="card-face card-back border border-line bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <img src={card.image} alt="" className="h-12 w-12 rounded-full bg-card object-cover" />
            <span className="rounded-full border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
              Hidden
            </span>
          </div>
          <p className="mt-4 font-medium leading-tight">{card.name}</p>
          <p className="font-mono text-xs text-muted">{card.symbol}</p>
          <p className="mt-3 line-clamp-2 text-sm text-muted">{card.blurb}</p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Tap to lock pick</p>
        </div>
        <div className="card-face card-front border border-line bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <img src={card.image} alt="" className="h-12 w-12 rounded-full bg-background object-cover" />
            {premium !== undefined && (
              <span
                className={`rounded-full px-2 py-1 font-mono text-xs tabular-nums ${cheap ? "bg-primary/15 text-primary" : rich ? "bg-danger/15 text-danger" : "text-muted"}`}
              >
                {formatPremium(premium)}
              </span>
            )}
          </div>
          <p className="mt-3 font-medium">{card.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
            <div className="rounded-lg bg-background px-2 py-2">
              <p className="text-muted">Mark</p>
              <p className="mt-1">${revealed ? formatUsd(revealed.markPrice) : "—"}</p>
            </div>
            <div className="rounded-lg bg-background px-2 py-2">
              <p className="text-muted">Token</p>
              <p className="mt-1">${revealed ? formatUsd(revealed.tokenPrice) : "—"}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {yours && <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">You</span>}
            {desk && <span className="rounded-full border border-line px-2 py-0.5 text-muted">Desk</span>}
            {winner && <span className="rounded-full border border-primary/40 px-2 py-0.5 text-primary">Extreme</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
