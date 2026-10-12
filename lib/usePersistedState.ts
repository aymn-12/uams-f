"use client";

import { useState, useCallback } from "react";
import { smartCache } from "./cache";

export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    return smartCache.getWorkspace<T>(key, initialValue);
  });

  const setPersistedState = useCallback(
    (valueOrFn: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof valueOrFn === "function" ? (valueOrFn as (p: T) => T)(prev) : valueOrFn;
        smartCache.setWorkspace(key, next);
        return next;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}
