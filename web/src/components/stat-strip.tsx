type Item = { label: string; value: string };

export function StatStrip({ items }: { items: Item[] }) {
  return (
    <div className="stat-strip flex flex-wrap overflow-hidden rounded-xl border border-line bg-card">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex min-w-[9rem] flex-1 items-baseline justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{item.label}</span>
          <span className="font-mono text-sm tabular-nums text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
