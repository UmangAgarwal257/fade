"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PlayCard, type RevealCard } from "@/components/play-card";
import {
  decodeScore,
  lockPickIx,
  openRoundIx,
  readPicks,
  roundPda,
  scorePda,
  settleSoloIx,
  settleVersusIx,
} from "@/lib/chain";
import { formatPremium, jupBuyLink, truncateAddress } from "@/lib/format";
import { PROGRAM_ID, STAKE_SOL, type Mode, type Prompt, type PublicCard } from "@/lib/game";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false },
);

type Deal = {
  cards: PublicCard[];
  prompt: Prompt;
  mode: Mode;
  hash: number[];
  seal: string;
  desk: string;
};

type Phase = "lobby" | "dealing" | "hand" | "locking" | "result";

const SOLO_DESK = PublicKey.default;
const STEPS = ["Sign pick", "Desk lock", "Reveal", "Settle"] as const;

function promptHeadline(prompt: Prompt): string {
  return prompt === "cheapest" ? "Find the cheapest versus mark" : "Find the richest versus mark";
}

function extremeIndex(cards: RevealCard[], prompt: Prompt): number {
  return cards.reduce((best, card, index) => {
    const better =
      prompt === "cheapest" ? card.premium < cards[best].premium : card.premium > cards[best].premium;
    return better ? index : best;
  }, 0);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function Play() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [mode, setMode] = useState<Mode>("solo");
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [nonce, setNonce] = useState<bigint | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealCard[] | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false, false]);
  const [result, setResult] = useState<{ player: number; desk: number; reason: string | null; deskPick: number | null } | null>(null);
  const [score, setScore] = useState<{ points: number; rounds: number } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ href: string; detail: string } | null>(null);

  const prompt = useMemo<Prompt>(() => (round % 2 === 0 ? "cheapest" : "richest"), [round]);
  const extreme = reveal ? extremeIndex(reveal, deal?.prompt ?? prompt) : null;
  const sessionDone = round >= 5;

  useEffect(() => {
    if (!reveal) return;
    setFlipped([false, false, false, false]);
    let cancel = false;
    reveal.forEach((_, index) => {
      window.setTimeout(() => {
        if (!cancel) {
          setFlipped((current) => {
            const next = [...current];
            next[index] = true;
            return next;
          });
        }
      }, 120 + index * 180);
    });
    return () => {
      cancel = true;
    };
  }, [reveal]);

  async function startRound() {
    setPhase("dealing");
    setError(null);
    setReveal(null);
    setResult(null);
    setPick(null);
    setSignature(null);
    setQuote(null);
    setStep(0);
    setFlipped([false, false, false, false]);
    try {
      const response = await fetch("/api/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt, seen }),
      });
      if (!response.ok) throw new Error("Could not deal a hand");
      const next = (await response.json()) as Deal;
      setDeal(next);
      setNonce(BigInt(crypto.getRandomValues(new Uint32Array(1))[0]) + BigInt(Date.now()));
      setPhase("hand");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deal failed");
      setPhase("lobby");
    }
  }

  async function submit(tx: Transaction): Promise<string> {
    if (!publicKey || !signTransaction) throw new Error("Connect a wallet that can sign.");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.feePayer = publicKey;
    tx.recentBlockhash = blockhash;
    const signed = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  }

  async function lock(index: number) {
    if (!publicKey || !deal || nonce === null) return;
    setPhase("locking");
    setError(null);
    setPick(index);
    setStep(0);
    try {
      const desk = deal.mode === "versus" ? new PublicKey(deal.desk) : SOLO_DESK;
      const existing = await connection.getAccountInfo(roundPda(publicKey, nonce));
      const picks = existing ? readPicks(existing.data) : null;
      const chosen = picks && picks.player !== 255 ? picks.player : index;
      if (chosen !== index) setPick(chosen);
      if (!picks || picks.player === 255) {
        const tx = new Transaction();
        if (!existing) {
          tx.add(
            openRoundIx({
              player: publicKey,
              nonce,
              mode: deal.mode === "versus" ? 1 : 0,
              prompt: deal.prompt === "richest" ? 1 : 0,
              mints: deal.cards.map((card) => card.mint),
              hash: deal.hash,
              desk,
            }),
          );
        }
        tx.add(lockPickIx(publicKey, nonce, index));
        await submit(tx);
      }
      setStep(1);

      if (deal.mode === "versus") {
        const deskResponse = await fetch("/api/desk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seal: deal.seal, player: publicKey.toBase58(), nonce: nonce.toString() }),
        });
        if (!deskResponse.ok) {
          const deskBody = (await deskResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(deskBody?.error ?? "The desk could not lock.");
        }
      }
      setStep(2);

      const revealed = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seal: deal.seal, pick: chosen }),
      });
      if (!revealed.ok) throw new Error("Reveal failed");
      const body = (await revealed.json()) as {
        cards: RevealCard[];
        playerPoints: number;
        deskPoints: number;
        deskPick: number | null;
        deskReason: string | null;
      };
      setReveal(body.cards);
      setResult({
        player: body.playerPoints,
        desk: body.deskPoints,
        reason: body.deskReason,
        deskPick: body.deskPick,
      });
      await sleep(900);
      setStep(3);

      const marks = body.cards.map((card) => BigInt(card.mark));
      const tokens = body.cards.map((card) => BigInt(card.token));
      const settle =
        deal.mode === "versus"
          ? settleVersusIx({
              player: publicKey,
              desk: new PublicKey(deal.desk),
              nonce,
              marks,
              tokens,
            })
          : settleSoloIx(publicKey, nonce, marks, tokens);
      const settleSig = await submit(new Transaction().add(settle));
      const scoreAccount = await connection.getAccountInfo(scorePda(publicKey));
      if (scoreAccount) setScore(decodeScore(scoreAccount.data));
      setSignature(settleSig);
      setSeen((current) => [...new Set([...current, ...body.cards.map((card) => card.symbol)])]);
      setRound((current) => Math.min(5, current + 1));
      setPhase("result");

      const picked = body.cards[chosen];
      const quoteResponse = await fetch(`/api/quote?mint=${picked.mint}`);
      const quoteBody = (await quoteResponse.json()) as { link?: string; quote?: string | null };
      setQuote({
        href: quoteBody.link ?? jupBuyLink(picked.mint),
        detail: quoteBody.quote ? `1 USDC ≈ ${quoteBody.quote} ${picked.symbol}` : "Mainnet Jupiter page",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The round failed");
      setPhase(deal ? "hand" : "lobby");
    }
  }

  function resetHand() {
    setDeal(null);
    setPhase("lobby");
    setReveal(null);
    setResult(null);
    setPick(null);
    setFlipped([false, false, false, false]);
  }

  const activeSteps = deal?.mode === "versus" ? STEPS : ["Sign pick", "Reveal", "Settle"];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Devnet desk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Fade the wrong premium</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WalletMultiButton />
          <div className="flex gap-2" role="group" aria-label="Mode">
            {(["solo", "versus"] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                disabled={phase === "locking" || (deal !== null && phase !== "result")}
                onClick={() => setMode(item)}
                className={`press min-h-11 rounded-full px-4 text-sm capitalize disabled:opacity-40 ${mode === item ? "bg-primary text-primary-foreground" : "border border-line text-muted"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Round</p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{Math.min(round + 1, 5)}<span className="text-muted">/5</span></p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Stake</p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{STAKE_SOL} SOL</p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Score</p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{score?.points ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Mode</p>
          <p className="mt-1 text-2xl capitalize">{mode}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5 md:p-6">
        {deal ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">{deal.prompt}</p>
              <h2 className="mt-1 text-xl tracking-tight md:text-2xl">{promptHeadline(deal.prompt)}</h2>
            </div>
            {phase === "locking" && (
              <div className="flex flex-wrap gap-2">
                {activeSteps.map((label, index) => (
                  <span
                    key={label}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] ${index <= step ? "bg-primary text-primary-foreground" : "border border-line text-muted"}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">
            {connected
              ? sessionDone
                ? "Five rounds down. Start a new session or check the table."
                : `Round ${round + 1} is ${prompt}. Deal four names, lock one on devnet, then watch the premiums flip.`
              : "Connect a devnet wallet to deal."}
          </p>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {phase === "lobby" && !sessionDone && (
          <button
            type="button"
            disabled={!connected}
            onClick={startRound}
            className="press mt-6 min-h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Deal round {round + 1}
          </button>
        )}

        {phase === "dealing" && (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rise h-44 animate-pulse rounded-2xl bg-background" style={{ animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
        )}

        {deal && phase !== "dealing" && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deal.cards.map((card, index) => (
              <PlayCard
                key={card.mint}
                card={card}
                index={index}
                revealed={reveal?.[index] ?? null}
                flipped={flipped[index]}
                yours={pick === index}
                desk={result?.deskPick === index}
                winner={extreme === index}
                disabled={phase !== "hand"}
                onPick={() => lock(index)}
              />
            ))}
          </div>
        )}

        {phase === "locking" && !reveal && (
          <p className="mt-4 font-mono text-xs text-muted">Signing on devnet. Do not switch cards.</p>
        )}

        {phase === "result" && result && deal && (
          <div className="rise mt-6 rounded-2xl border border-line bg-background p-4 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted">Round result</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  +{result.player}
                  <span className="text-lg text-muted"> pts</span>
                </p>
                {deal.mode === "versus" && (
                  <p className="mt-1 font-mono text-sm text-muted">
                    Desk {result.desk} pts · {result.player > result.desk ? "You take the pot" : result.player === result.desk ? "Stakes return" : "Desk takes the pot"}
                  </p>
                )}
              </div>
              {pick !== null && reveal && (
                <div className="font-mono text-xs text-muted">
                  <p>Your pick · {formatPremium(reveal[pick].premium)}</p>
                  {result.deskPick !== null && <p className="mt-1">Desk · {formatPremium(reveal[result.deskPick].premium)}</p>}
                </div>
              )}
            </div>
            {result.reason && <p className="mt-3 text-sm text-muted">{result.reason}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              {signature && (
                <a
                  className="press inline-flex min-h-11 items-center rounded-full border border-line px-4 font-mono text-xs"
                  href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Settlement {truncateAddress(signature)}
                </a>
              )}
              {quote && (
                <a
                  className="press inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                  href={quote.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy this name
                </a>
              )}
            </div>
            {quote && <p className="mt-2 font-mono text-xs text-muted">{quote.detail}</p>}
            {!sessionDone && (
              <button type="button" onClick={resetHand} className="press mt-4 min-h-11 text-sm text-primary">
                Next round
              </button>
            )}
          </div>
        )}
      </section>

      <p className="font-mono text-xs text-muted">Program {truncateAddress(PROGRAM_ID, 6)}</p>
    </div>
  );
}
