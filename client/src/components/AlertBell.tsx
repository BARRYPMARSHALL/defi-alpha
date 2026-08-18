import { useEffect, useState } from "react";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

interface WatchAlert {
  poolId: string;
  symbol: string;
  project: string;
  chain: string;
  previousApy: number;
  currentApy: number;
  changePct: number;
  direction: "up" | "down";
  message: string;
}

/**
 * APY-change alerts for the watchlist. Polls the server baseline diff every
 * 60s while the app is open. Empty watchlist → bell stays quiet.
 */
export function AlertBell() {
  const { watchlist, synced } = useWatchlist();
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!synced || watchlist.length === 0) return;

    const token = localStorage.getItem("yieldScoutWatchlistToken") || "";
    if (!token) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/watchlist/alerts", {
          headers: { "x-watchlist-token": token },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.alerts && data.alerts.length > 0) {
          setAlerts((prev) => {
            const ids = new Set(prev.map((a) => a.poolId));
            const fresh = data.alerts.filter((a: WatchAlert) => !ids.has(a.poolId));
            return [...fresh, ...prev].slice(0, 10);
          });
        }
      } catch {
        // offline — keep quiet
      }
    };

    poll();
    const interval = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [synced, watchlist.length]);

  if (watchlist.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Watchlist alerts">
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Watchlist alerts</span>
          {alerts.length > 0 && (
            <button
              onClick={() => setAlerts([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <ScrollArea className="h-64">
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>No APY changes detected yet.</p>
              <p className="text-xs mt-1">
                We watch your starred pools and alert you when APY moves
                significantly.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div key={`${alert.poolId}-${alert.currentApy}`} className="flex items-start gap-3 px-3 py-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      alert.direction === "up"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {alert.direction === "up" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{alert.message}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.project} · {alert.chain}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
