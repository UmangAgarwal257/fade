"use client";

import { formatPremium } from "@/lib/format";
import type { Prompt } from "@/lib/game";

type Props = {
  day: string;
  points: number;
  symbol: string;
  premium: number;
  prompt: Prompt;
};

function shareLine(props: Props): string {
  const verb = props.prompt === "cheapest" ? "cheapest vs mark" : "richest vs mark";
  return `Fade Daily ${props.day} · +${props.points} pts on ${props.symbol} (${formatPremium(props.premium)}, ${verb}) · prestocks.com`;
}

export function DailyShare({ day, points, symbol, premium, prompt }: Props) {
  const line = shareLine({ day, points, symbol, premium, prompt });

  async function copy() {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-background/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Share today</p>
      <p className="mt-2 text-sm text-foreground">{line}</p>
      <button
        type="button"
        onClick={copy}
        className="press mt-3 min-h-10 rounded-full border border-line px-4 text-sm text-muted"
      >
        Copy result
      </button>
    </div>
  );
}
