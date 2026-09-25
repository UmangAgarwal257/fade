import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { kv } from "@vercel/kv";
import { loadCatalogue } from "@/lib/catalogue";
import { dealDaily, utcDayKey, type Hand } from "@/lib/game";
import { sealHand } from "@/lib/seal";
import { deskKeypair } from "@/lib/desk";
import { dailyDir } from "@/lib/paths";

export type DailyScore = {
  wallet: string;
  points: number;
  signature: string;
  at: number;
};

type DailyFile = {
  day: string;
  hand: Hand;
  seal: string;
  scores: DailyScore[];
};

function kvEnabled(): boolean {
  return Boolean(process.env.KV_REST_API_URL);
}

function kvKey(day: string): string {
  return `fade:daily:${day}`;
}

function dayPath(day: string): string {
  return `${dailyDir()}/${day}.json`;
}

async function readDay(day: string): Promise<DailyFile | null> {
  if (kvEnabled()) {
    return (await kv.get<DailyFile>(kvKey(day))) ?? null;
  }
  const file = dayPath(day);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as DailyFile;
}

async function writeDay(file: DailyFile): Promise<void> {
  if (kvEnabled()) {
    await kv.set(kvKey(file.day), file);
    return;
  }
  mkdirSync(dailyDir(), { recursive: true });
  writeFileSync(dayPath(file.day), JSON.stringify(file, null, 2));
}

export async function loadDailyChallenge(day = utcDayKey()) {
  let file = await readDay(day);
  if (!file) {
    const hand = dealDaily(await loadCatalogue(), day);
    file = {
      day,
      hand,
      seal: sealHand(hand),
      scores: [],
    };
    await writeDay(file);
  }
  return {
    day: file.day,
    hand: file.hand,
    seal: file.seal,
    desk: deskKeypair().publicKey.toBase58(),
    scores: [...file.scores].sort((a, b) => b.points - a.points || a.at - b.at),
  };
}

export async function recordDailyScore(day: string, entry: DailyScore): Promise<DailyScore[]> {
  const file = await readDay(day);
  if (!file) throw new Error("No daily challenge for that day");
  const existing = file.scores.findIndex((row) => row.wallet === entry.wallet);
  if (existing >= 0) {
    const prior = file.scores[existing];
    if (entry.points <= prior.points) return sortedScores(file.scores);
    file.scores[existing] = entry;
  } else {
    file.scores.push(entry);
  }
  await writeDay(file);
  return sortedScores(file.scores);
}

function sortedScores(scores: DailyScore[]): DailyScore[] {
  return [...scores].sort((a, b) => b.points - a.points || a.at - b.at);
}
