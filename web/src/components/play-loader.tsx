"use client";

import dynamic from "next/dynamic";
import { PlaySkeleton } from "@/components/play-skeleton";

const Play = dynamic(() => import("@/components/play").then((mod) => mod.Play), {
  ssr: false,
  loading: () => <PlaySkeleton />,
});

export function PlayLoader({ variant = "session" }: { variant?: "session" | "daily" }) {
  return <Play variant={variant} />;
}
