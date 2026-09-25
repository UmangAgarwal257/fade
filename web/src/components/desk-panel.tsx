"use client";

type DeskState = "idle" | "waiting" | "locking" | "revealed" | "won" | "lost" | "tie";

type Props = {
  active: boolean;
  state: DeskState;
  reason: string | null;
  deskPick: string | null;
  step: number;
};

export function DeskPanel({ active, state, reason, deskPick, step }: Props) {
  if (!active) return null;

  const status =
    state === "locking"
      ? step < 1
        ? "Waiting for your lock"
        : "Signing its pick"
      : state === "revealed"
        ? "Premiums incoming"
        : state === "won"
          ? "Desk takes the pot"
          : state === "lost"
            ? "You take the pot"
            : state === "tie"
              ? "Stakes return"
              : "Ready when you are";

  return (
    <aside
      className={`rise surface lg:sticky lg:top-6 h-fit p-4 ${state === "locking" ? "desk-busy" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="desk-avatar flex h-10 w-10 items-center justify-center rounded-full bg-card font-mono text-xs font-semibold text-primary ring-1 ring-line">
          HD
        </div>
        <div>
          <p className="text-sm font-medium">House Desk</p>
          <p className="font-mono text-[10px] text-muted">Bias, not prices</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-primary">{status}</p>
      {deskPick && state !== "waiting" && state !== "locking" && (
        <p className="mt-2 font-mono text-xs tabular-nums">Locked {deskPick}</p>
      )}
      {reason && <p className="mt-2 text-sm leading-relaxed text-muted">{reason}</p>}
    </aside>
  );
}
