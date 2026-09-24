"use client";

import { useState } from "react";

const STORAGE_KEY = "isd_hidden_sections";

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Which dashboard sections the viewer has hidden. Remembered in this browser only.
 * The dashboard renders client-side only, so reading localStorage on first render is safe.
 */
export function useHiddenSections() {
  const [hidden, setHidden] = useState<string[]>(read);

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — keep the in-memory state
      }
      return next;
    });

  return { isHidden: (id: string) => hidden.includes(id), toggle };
}
