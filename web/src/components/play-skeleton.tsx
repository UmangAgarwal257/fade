export function PlaySkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="flex justify-between gap-4 border-b border-line pb-5">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-line" />
          <div className="h-8 w-48 rounded bg-line" />
        </div>
        <div className="h-11 w-36 rounded-full bg-line" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded-full bg-line" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-card" />
    </div>
  );
}
