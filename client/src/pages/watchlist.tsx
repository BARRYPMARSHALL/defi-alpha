import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { PoolsMobileCards } from "@/components/PoolsMobileCards";
import { PoolsTable } from "@/components/PoolsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { PoolsResponse, SortState } from "@shared/schema";

interface WatchAlert {
  poolId: string;
  symbol: string;
  project: string;
  chain: string;
  previousApy: number;
  currentApy: number;
  direction: "up" | "down";
  message: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  return date.toLocaleDateString();
}

export default function WatchlistPage() {
  const isMobile = useIsMobile();
  const { watchlist, toggleWatch, synced } = useWatchlist();
  const [sort, setSort] = useState<SortState>({ field: "apy", direction: "desc" });
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  // Dismissed alerts (by poolId) — survives refetches so dismissed alerts
  // stay gone for this session even when the server sends them again.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch the EXACT starred pools by id — a starred pool shows up regardless
  // of TVL or score. (The old approach filtered a top-N snapshot, which hid
  // every pool under $5M TVL behind the API's default minTvl filter.)
  const { data, isLoading } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", "watchlist-ids", watchlist],
    queryFn: async () => {
      const res = await fetch(`/api/pools?ids=${encodeURIComponent(watchlist.join(","))}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json();
    },
    enabled: watchlist.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch alerts for the watchlist token
  const token = (() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("defiAlphaWatchlistToken") || "" : "";
    } catch {
      return "";
    }
  })();
  const { data: alertData } = useQuery<{ alerts: WatchAlert[] }>({
    queryKey: ["/api/watchlist/alerts", token],
    queryFn: async () => {
      if (!token) return { alerts: [] };
      const res = await fetch("/api/watchlist/alerts", {
        headers: { "x-watchlist-token": token },
      });
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
    enabled: synced && watchlist.length > 0 && !!token,
    refetchInterval: 60_000,
  });

  // Server returns the pools in watchlist order
  const watchedPools = data?.pools || [];
  const serverAlerts = alertData?.alerts || [];
  // Server alerts take precedence once present; session-dismissed ones are
  // filtered out. Local `alerts` is the offline/fallback source.
  const currentAlerts = (serverAlerts.length > 0 ? serverAlerts : alerts).filter(
    (a) => !dismissed.has(a.poolId),
  );

  const dismissAlert = (poolId: string) => {
    setAlerts((prev) => prev.filter((a) => a.poolId !== poolId));
    setDismissed((prev) => new Set(prev).add(poolId));
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header lastUpdated={data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : null} />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Watchlist</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {watchlist.length > 0
            ? `${watchlist.length} starred pool${watchlist.length === 1 ? "" : "s"} — tap ★ to remove`
            : "Star pools from the search page to track them here"}
        </p>

        {/* Alerts */}
        {currentAlerts.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">APY alerts</h2>
            <div className="space-y-2">
              {currentAlerts.map((alert) => (
                <Card key={alert.poolId}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alert.direction === "up" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                      {alert.direction === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{alert.message}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.project} · {alert.chain}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.poolId)}>
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — only when the list itself is empty */}
        {!isLoading && watchlist.length === 0 && (
          <Card className="p-10 text-center">
            <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-lg mb-1">
              Your watchlist is empty
            </p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              Tap the ★ star on any pool on the Search tab to track it here.
            </p>
            <Button onClick={() => (window.location.href = "/")}>
              Browse pools to star
            </Button>
          </Card>
        )}

        {/* Watched pools */}
        {isLoading && watchlist.length > 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : watchedPools.length > 0 ? (
          isMobile ? (
            <PoolsMobileCards pools={watchedPools} isLoading={false} />
          ) : (
            <div className="rounded-lg border bg-card">
              <PoolsTable pools={watchedPools} sort={sort} onSortChange={setSort} isLoading={false} />
            </div>
          )
        ) : null}

        {/* Pools that no longer resolve (delisted from DeFiLlama) */}
        {!isLoading && watchlist.length > watchedPools.length && (
          <p className="mt-4 text-xs text-muted-foreground">
            {watchlist.length - watchedPools.length} starred pool(s) no longer available.
          </p>
        )}
      </main>
    </div>
  );
}
