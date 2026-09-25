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
  dimmed: boolean;
  locking: boolean;
  disabled: boolean;
  onPick: () => void;
};

export function PlayCard({ card, revealed, flipped, yours, desk, winner, dimmed, locking, disabled, onPick, index }: Props) {
  const premium = revealed?.premium;
  const rich = premium !== undefined && premium > 0;
  const cheap = premium !== undefined && premium < 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`card-scene rise press h-full w-full text-left ${yours ? "card-yours" : ""} ${dimmed ? "card-dim" : ""} ${locking && yours ? "card-locking" : ""} ${!disabled ? "card-hover" : ""}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={`card-inner ${flipped ? "card-flipped" : ""}`}>
        <div className="card-face card-back surface flex flex-col p-4">
          <div className="flex items-center gap-3">
            <img src={card.image} alt="" className="h-11 w-11 shrink-0 rounded-full bg-card object-cover ring-1 ring-line" />
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{card.name}</p>
              <p className="font-mono text-[11px] text-muted">{card.symbol}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{card.blurb}</p>
          <p className="card-cta mt-3 w-full rounded-lg border border-line bg-card/80 py-2 text-center font-mono text-[11px] text-foreground">
            Lock pick
          </p>
        </div>
        <div className="card-face card-front surface flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <img src={card.image} alt="" className="h-11 w-11 shrink-0 rounded-full bg-background object-cover ring-1 ring-line" />
            {premium !== undefined && (
              <span
                className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs tabular-nums ${cheap ? "bg-primary/15 text-primary" : rich ? "bg-danger/15 text-danger" : "text-muted"}`}
              >
                {formatPremium(premium)}
              </span>
            )}
          </div>
          <p className="mt-3 font-medium leading-tight">{card.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
            <div className="rounded-md bg-background/80 px-2.5 py-2">
              <p className="text-muted">Mark</p>
              <p className="mt-0.5 text-sm">${revealed ? formatUsd(revealed.markPrice) : "—"}</p>
            </div>
            <div className="rounded-md bg-background/80 px-2.5 py-2">
              <p className="text-muted">Token</p>
              <p className="mt-0.5 text-sm">${revealed ? formatUsd(revealed.tokenPrice) : "—"}</p>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {yours && <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">You</span>}
            {desk && <span className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">Desk</span>}
            {winner && <span className="rounded-md border border-primary/35 px-2 py-0.5 text-[11px] text-primary">Extreme</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
