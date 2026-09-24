"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useState } from "react";
import {
  decodeScore,
  lockPickIx,
  openRoundIx,
  scorePda,
  settleSoloIx,
  settleVersusIx,
} from "@/lib/chain";
import { PROGRAM_ID, STAKE_SOL, promptLabel, type Mode, type Prompt, type PublicCard } from "@/lib/game";

type Deal = {
  cards: PublicCard[];
  prompt: Prompt;
  mode: Mode;
  hash: number[];
  seal: string;
  desk: string;
};

type RevealCard = PublicCard & {
  markPrice: number;
  tokenPrice: number;
  premium: number;
  mark: string;
  token: string;
};

const SOLO_DESK = PublicKey.default;

export function Play() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [mode, setMode] = useState<Mode>("solo");
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [nonce, setNonce] = useState<bigint | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Connect a devnet wallet.");
  const [reveal, setReveal] = useState<RevealCard[] | null>(null);
  const [result, setResult] = useState<{ player: number; desk: number; reason: string | null; deskPick: number | null } | null>(null);
  const [score, setScore] = useState<{ points: number; rounds: number } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [quote, setQuote] = useState<string | null>(null);

  async function airdrop() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const sig = await connection.requestAirdrop(publicKey, 1_000_000_000);
      await connection.confirmTransaction(sig, "confirmed");
      setStatus("Airdrop confirmed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Airdrop failed");
    } finally {
      setBusy(false);
    }
  }

  async function startRound() {
    setBusy(true);
    setError(null);
    setReveal(null);
    setResult(null);
    setPick(null);
    setSignature(null);
    setQuote(null);
    try {
      const prompt: Prompt = round % 2 === 0 ? "cheapest" : "richest";
      const response = await fetch("/api/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt, seen }),
      });
      if (!response.ok) throw new Error("Could not deal a hand");
      const next = (await response.json()) as Deal;
      setDeal(next);
      setNonce(BigInt(crypto.getRandomValues(new Uint32Array(1))[0]) + BigInt(Date.now()));
      setStatus(`Round ${round + 1} of 5. Prices stay hidden until the pick lands.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deal failed");
    } finally {
      setBusy(false);
    }
  }

  async function lock(index: number) {
    if (!publicKey || !deal || nonce === null) return;
    setBusy(true);
    setError(null);
    setPick(index);
    try {
      const desk = deal.mode === "versus" ? new PublicKey(deal.desk) : SOLO_DESK;
      const tx = new Transaction().add(
        openRoundIx({
          player: publicKey,
          nonce,
          mode: deal.mode === "versus" ? 1 : 0,
          prompt: deal.prompt === "richest" ? 1 : 0,
          mints: deal.cards.map((card) => card.mint),
          hash: deal.hash,
          desk,
        }),
        lockPickIx(publicKey, nonce, index),
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setStatus("Pick is on devnet.");

      if (deal.mode === "versus") {
        let deskResponse = await fetch("/api/desk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seal: deal.seal, player: publicKey.toBase58(), nonce: nonce.toString() }),
        });
        if (!deskResponse.ok) {
          await fetch("/api/desk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fund: true }),
          });
          deskResponse = await fetch("/api/desk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seal: deal.seal, player: publicKey.toBase58(), nonce: nonce.toString() }),
          });
        }
        if (!deskResponse.ok) throw new Error("The desk could not lock. Fund it and retry.");
      }

      const revealed = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seal: deal.seal, pick: index }),
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
      const settleTx = new Transaction().add(settle);
      const settleSig = await sendTransaction(settleTx, connection);
      await connection.confirmTransaction(settleSig, "confirmed");
      const scoreAccount = await connection.getAccountInfo(scorePda(publicKey));
      if (scoreAccount) setScore(decodeScore(scoreAccount.data));
      setSignature(settleSig);
      setSeen((current) => [...new Set([...current, ...body.cards.map((card) => card.symbol)])]);
      setRound((current) => Math.min(5, current + 1));
      setStatus("Settled.");
      const quoteResponse = await fetch(`/api/quote?mint=${body.cards[index].mint}`);
      const quoteBody = (await quoteResponse.json()) as { link?: string; quote?: string | null };
      if (quoteBody.quote) {
        setQuote(`1 USDC quotes ${quoteBody.quote} raw units of ${body.cards[index].symbol}.`);
      } else if (quoteBody.link) {
        setQuote(quoteBody.link);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The round failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Devnet</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Fade the name that is wrong versus its mark.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Four PreStocks. Prices hidden. Your pick escrows {STAKE_SOL} SOL. Solo returns it. Versus, the higher score takes the pot.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <WalletMultiButton />
          <button
            type="button"
            disabled={!connected || busy}
            onClick={airdrop}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-40"
          >
            Airdrop devnet SOL
          </button>
        </div>
        <div className="mt-6 flex gap-2">
          {(["solo", "versus"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              disabled={busy || deal !== null && reveal === null}
              onClick={() => setMode(item)}
              className={`rounded-full px-4 py-2 text-sm capitalize ${mode === item ? "bg-primary text-primary-foreground" : "border border-line text-muted"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <p className="font-mono text-sm text-muted">{status}</p>
        {score && (
          <p className="mt-2 font-mono text-sm">
            On-chain score {score.points} across {score.rounds} rounds
          </p>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {!deal && (
          <button
            type="button"
            disabled={!connected || busy || round >= 5}
            onClick={startRound}
            className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {round >= 5 ? "Session complete" : `Deal round ${round + 1}`}
          </button>
        )}
        {deal && (
          <div className="mt-6">
            <h2 className="text-xl tracking-tight">{promptLabel(deal.prompt)}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {deal.cards.map((card, index) => {
                const shown = reveal?.[index];
                const chosen = pick === index;
                const deskChose = result?.deskPick === index;
                return (
                  <button
                    key={card.mint}
                    type="button"
                    disabled={busy || reveal !== null}
                    onClick={() => lock(index)}
                    className={`rounded-2xl border bg-card p-3 text-left transition disabled:cursor-default ${chosen ? "border-primary" : "border-line"}`}
                  >
                    <img src={card.image} alt="" className="h-10 w-10 rounded-full bg-background object-cover" />
                    <p className="mt-3 font-medium">{card.name}</p>
                    <p className="font-mono text-xs text-muted">{card.symbol}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{card.blurb}</p>
                    {shown && (
                      <p className="mt-3 font-mono text-xs">
                        mark {shown.markPrice.toFixed(2)} · token {shown.tokenPrice.toFixed(2)} ·{" "}
                        {(shown.premium * 100).toFixed(1)}%
                      </p>
                    )}
                    {chosen && <p className="mt-2 text-xs text-primary">Your pick</p>}
                    {deskChose && <p className="text-xs text-muted">Desk</p>}
                  </button>
                );
              })}
            </div>
            {busy && !reveal && <div className="mt-4 h-3 w-40 animate-pulse rounded-full bg-line" />}
            {result && (
              <div className="mt-5 space-y-2 text-sm">
                <p>
                  You scored {result.player}. {deal.mode === "versus" ? `Desk scored ${result.desk}.` : "Stake returns on settle."}
                </p>
                {result.reason && <p className="text-muted">{result.reason}</p>}
                {signature && (
                  <a
                    className="block font-mono text-xs text-primary underline"
                    href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  >
                    Settlement
                  </a>
                )}
                {quote?.startsWith("http") ? (
                  <a className="block text-sm text-muted underline" href={quote}>
                    Mainnet Jupiter quote for this mint
                  </a>
                ) : (
                  quote && <p className="text-muted">{quote}</p>
                )}
                {round < 5 && (
                  <button type="button" onClick={() => setDeal(null)} className="mt-2 text-sm text-primary">
                    Next round
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <p className="mt-8 font-mono text-xs text-muted">Program {PROGRAM_ID}</p>
      </section>
    </div>
  );
}
