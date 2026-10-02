"use client";

type DeskState = "idle" | "waiting" | "locking" | "revealed" | "won" | "lost" | "tie";

type Props = {
  active: boolean;
  state: DeskState;
  reason: string | null;
  deskPick: string | null;
  step: number;
  agentSource?: "clawpump" | "rules" | null;
  agentUrl?: string | null;
};

export function DeskPanel({ active, state, reason, deskPick, step, agentSource, agentUrl }: Props) {
  if (!active) return null;

  const status =
    state === "locking"
      ? step < 1
        ? "Waiting for your lock"
        : agentSource === "clawpump"
          ? "Fade Desk agent choosing"
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

  const subtitle =
    agentSource === "clawpump"
      ? "ClawPump · symbols only"
      : agentSource === "rules"
        ? "Local rules (set CLAWPUMP_API_KEY)"
        : "Fade Desk house";

  return (
    <aside
      className={`rise surface lg:sticky lg:top-6 h-fit p-4 ${state === "locking" ? "desk-busy" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="desk-avatar flex h-10 w-10 items-center justify-center rounded-full bg-card font-mono text-xs font-semibold text-primary ring-1 ring-line">
          FD
        </div>
        <div>
          <p className="text-sm font-medium">Fade Desk</p>
          <p className="font-mono text-[10px] text-muted">{subtitle}</p>
        </div>
      </div>
      {agentUrl && (
        <a
          href={agentUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block font-mono text-[10px] text-primary underline-offset-2 hover:underline"
        >
          View agent on ClawPump
        </a>
      )}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-primary">{status}</p>
      {deskPick && state !== "waiting" && state !== "locking" && (
        <p className="mt-2 font-mono text-xs tabular-nums">Locked {deskPick}</p>
      )}
      {reason && <p className="mt-2 text-sm leading-relaxed text-muted">{reason}</p>}
    </aside>
  );
}
