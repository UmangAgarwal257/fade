import path from "path";

/** Writable data root: local `keys/`, or `/tmp/fade` on Vercel when unset. */
export function dataRoot(): string {
  if (process.env.FADE_DATA_DIR) return process.env.FADE_DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "fade");
  return path.join(process.cwd(), "..", "keys");
}

export function dailyDir(): string {
  return path.join(dataRoot(), "daily");
}
