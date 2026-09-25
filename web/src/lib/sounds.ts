let audio: AudioContext | null = null;
let muted = false;

function canPlay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return !muted;
}

function context(): AudioContext | null {
  if (!canPlay()) return null;
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume().catch(() => undefined);
  return audio;
}

function tone(freq: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

export function loadSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  muted = localStorage.getItem("fade-sound") === "0";
  return !muted;
}

export function setSoundEnabled(on: boolean) {
  muted = !on;
  if (typeof window !== "undefined") localStorage.setItem("fade-sound", on ? "1" : "0");
}

export function soundEnabled(): boolean {
  return !muted;
}

export const sfx = {
  deal() {
    tone(220, 0.08, 0.04);
    window.setTimeout(() => tone(330, 0.1, 0.03), 60);
  },
  pick() {
    tone(440, 0.06, 0.05, "triangle");
  },
  step() {
    tone(520, 0.05, 0.035);
  },
  flip() {
    tone(280, 0.07, 0.03, "triangle");
  },
  settle() {
    tone(392, 0.12, 0.04);
    window.setTimeout(() => tone(523, 0.14, 0.03), 90);
  },
  win() {
    tone(523, 0.1, 0.04);
    window.setTimeout(() => tone(659, 0.12, 0.035), 80);
  },
  lose() {
    tone(220, 0.14, 0.03);
  },
  tie() {
    tone(330, 0.1, 0.03);
  },
  complete() {
    tone(440, 0.1, 0.035);
    window.setTimeout(() => tone(554, 0.1, 0.03), 100);
    window.setTimeout(() => tone(659, 0.14, 0.025), 200);
  },
};
