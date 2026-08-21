import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "defiAlphaWatchlist";
const TOKEN_KEY = "defiAlphaWatchlistToken";
// Broadcast channel + event name keep every mounted useWatchlist instance in
// sync (dashboard, watchlist page, AlertBell, etc.) when one of them changes.
const SYNC_EVENT = "defi-alpha:watchlist";

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
 * The server is the durable copy (keyed by an anonymous token): after each
 * change we reconcile the FULL list (diff against the server — POST missing,
 * DELETE removed) on a short debounce, so rapid toggles, deletions, and
 * multi-device edits never lose or resurrect entries. Changes are broadcast
 * to every mounted instance of this hook.
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [synced, setSynced] = useState(false);
  // Latest known-good list for the debounced reconciler (avoids stale closures)
  const listRef = useRef<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyList = useCallback((next: string[]) => {
    listRef.current = next;
    setWatchlist(next);
    saveWatchlist(next);
    try {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
    } catch {
      // ignore
    }
  }, []);

  /** Diff the local list against the server: POST adds, DELETE removals. */
  const reconcile = useCallback(async (local: string[]) => {
    const token = getOrCreateToken();
    if (!token) return;
    try {
      const res = await fetch("/api/watchlist", {
        headers: { "x-watchlist-token": token },
      });
      if (!res.ok) return;
      const server: string[] = (await res.json()).watchlist || [];

      const localSet = new Set(local);
      const serverSet = new Set(server);
      const toAdd = local.filter((id) => !serverSet.has(id));
      const toRemove = server.filter((id) => !localSet.has(id));

      await Promise.all([
        ...toAdd.map((id) =>
          fetch("/api/watchlist", {
            method: "POST",
            headers: { "x-watchlist-token": token, "Content-Type": "application/json" },
            body: JSON.stringify({ token, poolId: id }),
          }).catch(() => {}),
        ),
        ...toRemove.map((id) =>
          fetch(`/api/watchlist/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { "x-watchlist-token": token },
          }).catch(() => {}),
        ),
      ]);
    } catch {
      // offline — the debounce will retry on the next change
    }
  }, []);

  const scheduleReconcile = useCallback(
    (list: string[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reconcile(listRef.current);
      }, 400);
    },
    [reconcile],
  );

  // Load once: local list first, then pull server state and reconcile.
  useEffect(() => {
    applyList(loadWatchlist());
    const token = getOrCreateToken();
    if (!token) return;

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
        // Union with the local list so nothing the user did this session is
        // lost; the reconciler below will DELETE ids the server has but the
        // user removed locally.
        const merged = Array.from(new Set([...listRef.current, ...serverIds]));
        applyList(merged);
        setSynced(true);
        scheduleReconcile(merged);
      } catch {
        // offline — keep local state
      }
    })();

    // Reflect changes made in OTHER tabs/instances
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          applyList(JSON.parse(e.newValue).filter((x: unknown) => typeof x === "string"));
        } catch {
          // ignore
        }
      }
    };
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) applyList(detail.filter((x) => typeof x === "string"));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, onSync);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SYNC_EVENT, onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWatched = useCallback(
    (poolId: string) => watchlist.includes(poolId),
    [watchlist],
  );

  const toggleWatch = useCallback(
    (poolId: string) => {
      setWatchlist((prev) => {
        const next = prev.includes(poolId)
          ? prev.filter((id) => id !== poolId)
          : [...prev, poolId];
        applyList(next);
        scheduleReconcile(next);
        return next;
      });
    },
    [applyList, scheduleReconcile],
  );

  const clearWatchlist = useCallback(() => {
    applyList([]);
    scheduleReconcile([]);
  }, [applyList, scheduleReconcile]);

  return { watchlist, isWatched, toggleWatch, clearWatchlist, count: watchlist.length, synced };
}