import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { PROGRAM_ID } from "./game";

const programId = new PublicKey(PROGRAM_ID);

function disc(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

function u64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

export function roundPda(player: PublicKey, nonce: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("round"), player.toBuffer(), u64(nonce)],
    programId,
  )[0];
}

export function scorePda(player: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("score"), player.toBuffer()], programId)[0];
}

export function openRoundIx(args: {
  player: PublicKey;
  nonce: bigint;
  mode: number;
  prompt: number;
  mints: string[];
  hash: number[];
  desk: PublicKey;
}): TransactionInstruction {
  const data = Buffer.concat([
    disc("42eb7bf00823b99f"),
    u64(args.nonce),
    Buffer.from([args.mode, args.prompt]),
    Buffer.concat(args.mints.map((mint) => new PublicKey(mint).toBuffer())),
    Buffer.from(args.hash),
    args.desk.toBuffer(),
  ]);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.player, isSigner: true, isWritable: true },
      { pubkey: roundPda(args.player, args.nonce), isSigner: false, isWritable: true },
      { pubkey: scorePda(args.player), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function lockPickIx(player: PublicKey, nonce: bigint, pick: number): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: player, isSigner: true, isWritable: false },
      { pubkey: roundPda(player, nonce), isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([disc("26808a222a317416"), Buffer.from([pick])]),
  });
}

export function lockDeskIx(desk: PublicKey, player: PublicKey, nonce: bigint, pick: number): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: desk, isSigner: true, isWritable: true },
      { pubkey: roundPda(player, nonce), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("c1d38086175d908c"), Buffer.from([pick])]),
  });
}

export function settleSoloIx(player: PublicKey, nonce: bigint, marks: bigint[], tokens: bigint[]): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: roundPda(player, nonce), isSigner: false, isWritable: true },
      { pubkey: player, isSigner: false, isWritable: true },
      { pubkey: scorePda(player), isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([
      disc("4e60036dfd3b9b5d"),
      ...marks.map(u64),
      ...tokens.map(u64),
    ]),
  });
}

export function cancelVersusIx(player: PublicKey, nonce: bigint): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: roundPda(player, nonce), isSigner: false, isWritable: true },
    ],
    data: disc("122b881883280368"),
  });
}

export function settleVersusIx(args: {
  player: PublicKey;
  desk: PublicKey;
  nonce: bigint;
  marks: bigint[];
  tokens: bigint[];
}): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: roundPda(args.player, args.nonce), isSigner: false, isWritable: true },
      { pubkey: args.player, isSigner: false, isWritable: true },
      { pubkey: args.desk, isSigner: false, isWritable: true },
      { pubkey: scorePda(args.player), isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([
      disc("61054849b4f3c21f"),
      ...args.marks.map(u64),
      ...args.tokens.map(u64),
    ]),
  });
}

const PICK_OFFSET = 8 + 32 + 32 + 8 + 1 + 1 + 32 * 4 + 32;

export function readPicks(data: Buffer): { player: number; desk: number } {
  return { player: data[PICK_OFFSET] ?? 255, desk: data[PICK_OFFSET + 1] ?? 255 };
}

export function decodeScore(data: Buffer): { points: number; rounds: number } {
  return {
    points: data.readUInt32LE(8 + 32),
    rounds: data.readUInt32LE(8 + 32 + 4),
  };
}
