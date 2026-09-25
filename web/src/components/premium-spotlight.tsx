"use client";

import { formatPremium } from "@/lib/format";
import type { RevealCard } from "@/components/play-card";

type Props = {
  cards: RevealCard[];
  prompt: "cheapest" | "richest";
  yours: number | null;
  desk: number | null;
};

export function PremiumSpotlight({ cards, prompt, yours, desk }: Props) {
  const sorted = [...cards]
    .map((card, index) => ({ card, index }))
    .sort((a, b) => (prompt === "cheapest" ? a.card.premium - b.card.premium : b.card.premium - a.card.premium));

  const span = Math.max(0.01, ...cards.map((card) => Math.abs(card.premium)));

  return (
    <div className="border-t border-line pt-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Premiums in this hand</p>
      <ul className="mt-3 space-y-2.5">
        {sorted.map(({ card, index }) => {
          const width = `${Math.max(6, (Math.abs(card.premium) / span) * 100)}%`;
          const highlight = index === yours || index === desk;
          return (
            <li key={card.mint} className={highlight ? "spot-row-hot" : ""}>
              <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
                <span className="truncate text-muted">{card.symbol}</span>
                <span className={`tabular-nums ${card.premium < 0 ? "text-primary" : card.premium > 0 ? "text-danger" : "text-muted"}`}>
                  {formatPremium(card.premium)}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/80">
                <div className="spot-bar h-full rounded-full bg-muted/50" style={{ width }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
