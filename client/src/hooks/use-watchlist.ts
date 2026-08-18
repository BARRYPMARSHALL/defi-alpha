import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "defiAlphaWatchlist";
const TOKEN_KEY = "defiAlphaWatchlistToken";

function loadWatchlist(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

function saveWatchlist(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function getOrCreateToken(): string {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = `da-${crypto.randomUUID()}`;
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "";
  }
}

/**
 * Watchlist hook with server sync.
 *
 * Local-first: reads/writes localStorage instantly so the UI never blocks.
 * When the server is reachable, the full list is synced up so the watchlist
 * survives across devices (keyed by an anonymous token in localStorage).
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [synced, setSynced] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    const local = loadWatchlist();
    setWatchlist(local);

    const token = getOrCreateToken();
    if (!token) return;

    // Pull server state and merge (server wins on conflict for durability)
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/watchlist", {
          headers: { "x-watchlist-token": token },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const serverIds: string[] = data.watchlist || [];
        const merged = Array.from(new Set([...local, ...serverIds]));
        setWatchlist(merged);
        saveWatchlist(merged);
        setSynced(true);
      } catch {
        // offline — keep local state
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isWatched = useCallback(
    (poolId: string) => watchlist.includes(poolId),
    [watchlist]
  );

  const toggleWatch = useCallback((poolId: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(poolId)
        ? prev.filter((id) => id !== poolId)
        : [...prev, poolId];
      saveWatchlist(next);

      // Fire-and-forget server sync (only when not already syncing)
      if (!syncingRef.current) {
        syncingRef.current = true;
        const token = getOrCreateToken();
        if (token) {
          const method = next.includes(poolId) ? "POST" : "DELETE";
          void fetch(
            method === "POST"
              ? "/api/watchlist"
              : `/api/watchlist/${encodeURIComponent(poolId)}`,
            {
              method,
              headers: { "x-watchlist-token": token, "Content-Type": "application/json" },
              body: method === "POST" ? JSON.stringify({ token, poolId }) : undefined,
            },
          )
            .catch(() => {})
            .finally(() => {
              syncingRef.current = false;
            });
        }
      }

      return next;
    });
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    saveWatchlist([]);
  }, []);

  return { watchlist, isWatched, toggleWatch, clearWatchlist, count: watchlist.length, synced };
}
