"use client";

import { ErrorState } from "@/components/sticker/RouteState";

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} />;
}
