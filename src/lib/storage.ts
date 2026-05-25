/**
 * Unified browser storage utilities.
 *
 * Provides:
 *  - useLocalStorage<T>  — reactive, JSON-serialised localStorage hook
 *  - useSessionStorage<T>— reactive, JSON-serialised sessionStorage hook
 *  - plain get/set/remove helpers for non-reactive usage
 *
 * All reads are safe to call during SSR (returns defaultValue).
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function safeRead<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(storage: Storage, key: string, value: T): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode – silently ignore
  }
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ---------------------------------------------------------------------------
// Generic reactive hook factory
// ---------------------------------------------------------------------------

type UseStorageFn = <T>(
  key: string,
  defaultValue: T
) => [T, (val: T | ((prev: T) => T)) => void, () => void];

function makeUseStorage(getStorage: () => Storage): UseStorageFn {
  return function useStorage<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void, () => void] {
    const [value, setValueState] = useState<T>(() => {
      if (!isClient()) return defaultValue;
      return safeRead(getStorage(), key, defaultValue);
    });

    // Keep defaultValue stable via ref so the effect doesn't re-run on every render
    const defaultRef = useRef(defaultValue);
    defaultRef.current = defaultValue;

    // Sync from storage if key changes after mount
    useEffect(() => {
      if (!isClient()) return;
      setValueState(safeRead(getStorage(), key, defaultRef.current));
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for changes from other tabs / windows (localStorage only)
    useEffect(() => {
      if (!isClient()) return;
      const handler = (e: StorageEvent) => {
        if (e.key === key && e.storageArea === getStorage()) {
          setValueState(
            e.newValue !== null
              ? (JSON.parse(e.newValue) as T)
              : defaultRef.current
          );
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    const setValue = useCallback(
      (valOrUpdater: T | ((prev: T) => T)) => {
        setValueState((prev) => {
          const next =
            typeof valOrUpdater === "function"
              ? (valOrUpdater as (prev: T) => T)(prev)
              : valOrUpdater;
          if (isClient()) safeWrite(getStorage(), key, next);
          return next;
        });
      },
      [key] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const remove = useCallback(() => {
      if (isClient()) {
        try { getStorage().removeItem(key); } catch { /* ignore */ }
      }
      setValueState(defaultRef.current);
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    return [value, setValue, remove];
  };
}

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------

export const useLocalStorage = makeUseStorage(() => localStorage);
export const useSessionStorage = makeUseStorage(() => sessionStorage);

// ---------------------------------------------------------------------------
// Plain (non-reactive) helpers
// ---------------------------------------------------------------------------

export const ls = {
  get<T>(key: string, fallback: T): T {
    if (!isClient()) return fallback;
    return safeRead(localStorage, key, fallback);
  },
  set<T>(key: string, value: T): void {
    if (!isClient()) return;
    safeWrite(localStorage, key, value);
  },
  remove(key: string): void {
    if (!isClient()) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const ss = {
  get<T>(key: string, fallback: T): T {
    if (!isClient()) return fallback;
    return safeRead(sessionStorage, key, fallback);
  },
  set<T>(key: string, value: T): void {
    if (!isClient()) return;
    safeWrite(sessionStorage, key, value);
  },
  remove(key: string): void {
    if (!isClient()) return;
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};
