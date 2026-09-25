"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeskPanel } from "@/components/desk-panel";
import { PremiumSpotlight } from "@/components/premium-spotlight";
import { PlayCard, type RevealCard } from "@/components/play-card";
import { DailyLeaderboard, type LeaderRow } from "@/components/daily-leaderboard";
import { DailyShare } from "@/components/daily-share";
import { SessionRecap, type RoundLog } from "@/components/session-recap";
import { StatStrip } from "@/components/stat-strip";
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
import {
  PROGRAM_ID,
  STAKE_SOL,
  dailyPrompt,
  type Mode,
  type Prompt,
  type PublicCard,
} from "@/lib/game";
import { loadSoundPref, setSoundEnabled, sfx, soundEnabled } from "@/lib/sounds";

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
  day?: string;
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

type PlayVariant = "session" | "daily";

type DailyMeta = {
  day: string;
  leaderboard: LeaderRow[];
};

function readDailyCache(day: string): { points: number; symbol: string; premium: number } | null {
  try {
    const raw = localStorage.getItem(`fade-daily-${day}`);
    if (!raw) return null;
    return JSON.parse(raw) as { points: number; symbol: string; premium: number };
  } catch {
    return null;
  }
}

function writeDailyCache(day: string, body: { points: number; symbol: string; premium: number }) {
  localStorage.setItem(`fade-daily-${day}`, JSON.stringify(body));
}

export function Play({ variant = "session" }: { variant?: PlayVariant }) {
  const isDaily = variant === "daily";
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
  const [roundLog, setRoundLog] = useState<RoundLog[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [dailyMeta, setDailyMeta] = useState<DailyMeta | null>(null);
  const [dailyCache, setDailyCache] = useState<{ points: number; symbol: string; premium: number } | null>(null);
  const flipCount = useRef(0);
  const resultFx = useRef(false);

  const prompt = useMemo<Prompt>(() => {
    if (isDaily && deal) return deal.prompt;
    return round % 2 === 0 ? "cheapest" : "richest";
  }, [deal, isDaily, round]);
  const extreme = reveal ? extremeIndex(reveal, deal?.prompt ?? prompt) : null;
  const sessionDone = isDaily ? round >= 1 : round >= 5;
  const allFlipped = flipped.every(Boolean);
  const versus = mode === "versus" || deal?.mode === "versus";

  useEffect(() => {
    setSoundOn(loadSoundPref());
  }, []);

  useEffect(() => {
    if (!isDaily) return;
    let cancel = false;
    fetch("/api/daily")
      .then((response) => response.json())
      .then((body: DailyMeta & { day: string }) => {
        if (cancel) return;
        setDailyMeta({ day: body.day, leaderboard: body.leaderboard ?? [] });
        setDailyCache(readDailyCache(body.day));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [isDaily]);

  useEffect(() => {
    if (!reveal) {
      flipCount.current = 0;
      return;
    }
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

  useEffect(() => {
    const count = flipped.filter(Boolean).length;
    if (count > flipCount.current) sfx.flip();
    flipCount.current = count;
  }, [flipped]);

  useEffect(() => {
    if (phase !== "result" || resultFx.current) return;
    resultFx.current = true;
    sfx.settle();
    if (deal?.mode === "versus" && result) {
      if (result.player > result.desk) sfx.win();
      else if (result.player < result.desk) sfx.lose();
      else sfx.tie();
    }
  }, [phase, deal?.mode, result]);

  useEffect(() => {
    if (phase !== "result") resultFx.current = false;
  }, [phase, deal?.cards]);

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
      const response = isDaily
        ? await fetch("/api/daily")
        : await fetch("/api/deal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, prompt, seen }),
          });
      if (!response.ok) throw new Error(isDaily ? "Could not load today's hand" : "Could not deal a hand");
      const next = (await response.json()) as Deal & { day?: string; leaderboard?: LeaderRow[] };
      if (isDaily && next.day) {
        setDailyMeta({ day: next.day, leaderboard: next.leaderboard ?? [] });
        if (readDailyCache(next.day)) setDailyCache(readDailyCache(next.day));
      }
      setDeal(next);
      setNonce(BigInt(crypto.getRandomValues(new Uint32Array(1))[0]) + BigInt(Date.now()));
      setPhase("hand");
      sfx.deal();
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
    sfx.pick();
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
      sfx.step();

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
      sfx.step();

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
      sfx.step();

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
      setRoundLog((log) => [
        ...log,
        {
          round: round + 1,
          points: body.playerPoints,
          deskPoints: deal.mode === "versus" ? body.deskPoints : null,
          symbol: body.cards[chosen].symbol,
          premium: body.cards[chosen].premium,
          mode: deal.mode,
        },
      ]);
      setRound((current) => {
        const cap = isDaily ? 1 : 5;
        const next = Math.min(cap, current + 1);
        if (next >= cap) window.setTimeout(() => sfx.complete(), 500);
        return next;
      });
      setPhase("result");

      const picked = body.cards[chosen];
      const dayKey = deal.day ?? dailyMeta?.day;
      if (isDaily && publicKey && dayKey) {
        const scoreResponse = await fetch("/api/daily/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day: dayKey,
            wallet: publicKey.toBase58(),
            points: body.playerPoints,
            signature: settleSig,
          }),
        });
        if (scoreResponse.ok) {
          const scored = (await scoreResponse.json()) as { leaderboard: LeaderRow[] };
          setDailyMeta({ day: dayKey, leaderboard: scored.leaderboard });
        }
        const cache = { points: body.playerPoints, symbol: picked.symbol, premium: picked.premium };
        writeDailyCache(dayKey, cache);
        setDailyCache(cache);
      }
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

  function newSession() {
    setRound(0);
    setRoundLog([]);
    setSeen([]);
    resetHand();
    setQuote(null);
    setSignature(null);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) sfx.step();
  }

  const activeSteps = deal?.mode === "versus" ? STEPS : ["Sign pick", "Reveal", "Settle"];

  const deskState =
    phase === "locking"
      ? "locking"
      : phase === "result" && result && deal?.mode === "versus"
        ? result.player > result.desk
          ? "lost"
          : result.player < result.desk
            ? "won"
            : "tie"
        : reveal
          ? "revealed"
          : deal
            ? "waiting"
            : "idle";

  const deskSymbol =
    result && result.deskPick !== null && reveal ? reveal[result.deskPick].symbol : null;

  const alreadyPlayedDaily =
    isDaily &&
    dailyMeta &&
    (dailyCache !== null ||
      (publicKey && dailyMeta.leaderboard.some((row) => row.wallet === publicKey.toBase58())));

  const dailyDoneCopy =
    dailyCache ??
    (dailyMeta && publicKey
      ? (() => {
          const row = dailyMeta.leaderboard.find((item) => item.wallet === publicKey.toBase58());
          return row ? { points: row.points, symbol: "—", premium: 0 } : null;
        })()
      : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            {isDaily ? "UTC daily" : "Devnet desk"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {isDaily ? "Today's Fade" : "Fade the wrong premium"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WalletMultiButton />
          <button
            type="button"
            onClick={toggleSound}
            className="press min-h-11 rounded-full border border-line px-4 font-mono text-xs text-muted"
            aria-pressed={soundOn}
          >
            Sound {soundOn && soundEnabled() ? "on" : "off"}
          </button>
          {!isDaily && (
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
          )}
        </div>
      </div>

      <StatStrip
        items={
          isDaily
            ? [
                { label: "Day", value: dailyMeta?.day ?? "…" },
                { label: "Stake", value: `${STAKE_SOL} SOL` },
                { label: "Board", value: String(dailyMeta?.leaderboard.length ?? 0) },
                { label: "Mode", value: "solo" },
              ]
            : [
                { label: "Round", value: `${Math.min(round + 1, 5)}/5` },
                { label: "Stake", value: `${STAKE_SOL} SOL` },
                { label: "Score", value: String(score?.points ?? 0) },
                { label: "Mode", value: mode },
              ]
        }
      />

      <div
        className={`grid gap-5 ${versus ? "lg:grid-cols-[minmax(0,1fr)_12.5rem]" : isDaily ? "lg:grid-cols-[minmax(0,1fr)_14rem]" : ""}`}
      >
      <section className="play-desk-glow border border-line p-5 md:p-6">
        {deal ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="prompt-ribbon min-w-[min(100%,18rem)] flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">{deal.prompt}</p>
              <h2 className="mt-1 text-lg font-medium tracking-tight md:text-xl">{promptHeadline(deal.prompt)}</h2>
            </div>
            {phase === "locking" && (
              <div className="flex flex-wrap gap-1.5">
                {activeSteps.map((label, index) => (
                  <span
                    key={label}
                    className={`rounded-md px-2.5 py-1 font-mono text-[10px] ${index <= step ? "bg-primary text-primary-foreground" : "border border-line text-muted"}`}
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
              ? isDaily
                ? alreadyPlayedDaily
                  ? "You already locked today's hand. Scores reset at 00:00 UTC."
                  : "Everyone gets the same four PreStocks and prompt. Lock once on devnet to join the board."
                : sessionDone
                  ? "Five rounds down. Start a new session or check the table."
                  : `Round ${round + 1} is ${prompt}. Deal four names, lock one on devnet, then watch the premiums flip.`
              : isDaily
                ? "Connect a devnet wallet to play today's Fade."
                : "Connect a devnet wallet to deal."}
          </p>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {phase === "lobby" && sessionDone && roundLog.length > 0 && (
          <SessionRecap log={roundLog} total={roundLog.reduce((sum, row) => sum + row.points, 0)} onNewSession={newSession} />
        )}

        {phase === "lobby" && !sessionDone && !alreadyPlayedDaily && (
          <button
            type="button"
            disabled={!connected}
            onClick={startRound}
            className="press mt-6 min-h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {isDaily ? "Load today's hand" : `Deal round ${round + 1}`}
          </button>
        )}

        {isDaily && phase === "lobby" && alreadyPlayedDaily && dailyMeta && dailyDoneCopy && (
          <div className="mt-6 space-y-3">
            <p className="text-sm">
              You scored <span className="font-semibold tabular-nums">+{dailyDoneCopy.points}</span> today.
            </p>
            {dailyCache && (
              <DailyShare
                day={dailyMeta.day}
                points={dailyCache.points}
                symbol={dailyCache.symbol}
                premium={dailyCache.premium}
                prompt={deal?.prompt ?? dailyPrompt(dailyMeta.day)}
              />
            )}
          </div>
        )}

        {phase === "dealing" && (
          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rise min-h-[15.5rem] animate-pulse rounded-xl bg-background/80" style={{ animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
        )}

        {deal && phase !== "dealing" && (
          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
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
                dimmed={phase === "result" && allFlipped && pick !== index && result?.deskPick !== index && extreme !== index}
                locking={phase === "locking"}
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
          <div className="rise round-sheet mt-5 p-4 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Round result</p>
                <p className="points-pop mt-1 text-2xl font-semibold tabular-nums md:text-3xl">
                  +{result.player}
                  <span className="text-base text-muted md:text-lg"> pts</span>
                </p>
                {deal.mode === "versus" && (
                  <p className="mt-1 font-mono text-xs text-muted">
                    Desk {result.desk} pts ·{" "}
                    {result.player > result.desk ? "You take the pot" : result.player === result.desk ? "Stakes return" : "Desk takes the pot"}
                  </p>
                )}
              </div>
              {pick !== null && reveal && (
                <div className="flex gap-4 font-mono text-[11px] text-muted">
                  <p>You {formatPremium(reveal[pick].premium)}</p>
                  {result.deskPick !== null && <p>Desk {formatPremium(reveal[result.deskPick].premium)}</p>}
                </div>
              )}
            </div>
            {allFlipped && reveal && (
              <PremiumSpotlight cards={reveal} prompt={deal.prompt} yours={pick} desk={result.deskPick ?? null} />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {signature && (
                <a
                  className="press inline-flex min-h-10 items-center rounded-lg border border-line px-3 font-mono text-[11px]"
                  href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Settlement {truncateAddress(signature)}
                </a>
              )}
              {quote && (
                <a
                  className="press inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                  href={quote.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy this name
                </a>
              )}
              {!sessionDone && !isDaily && (
                <button
                  type="button"
                  onClick={resetHand}
                  className="press ml-auto inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
                >
                  Next round
                </button>
              )}
            </div>
            {quote && <p className="mt-2 font-mono text-[11px] text-muted">{quote.detail}</p>}
            {isDaily && dailyMeta && result && pick !== null && reveal && (
              <DailyShare
                day={dailyMeta.day}
                points={result.player}
                symbol={reveal[pick].symbol}
                premium={reveal[pick].premium}
                prompt={deal.prompt}
              />
            )}
          </div>
        )}
      </section>

      {isDaily && dailyMeta && (
        <DailyLeaderboard day={dailyMeta.day} rows={dailyMeta.leaderboard} you={publicKey?.toBase58()} />
      )}

      <DeskPanel
        active={versus}
        state={deskState}
        reason={result?.reason ?? null}
        deskPick={deskSymbol}
        step={step}
      />
      </div>

      <p className="font-mono text-xs text-muted">Program {truncateAddress(PROGRAM_ID, 6)}</p>
    </div>
  );
}
