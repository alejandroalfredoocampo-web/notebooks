"use client";

import { useEffect } from "react";

const KEY = "recent_models";
const MAX = 12;

/** Registra el modelo visto en localStorage (para "Vistos recientemente"). Sin UI. */
export default function TrackView({ modelId }: { modelId: string }) {
  useEffect(() => {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const next = [modelId, ...prev.filter((id) => id !== modelId)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, [modelId]);
  return null;
}
