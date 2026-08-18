import { Star, Flame, ExternalLink, RefreshCw, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/Sparkline";
import { useWatchlist } from "@/hooks/use-watchlist";
import { getGasInfo } from "@/lib/gas-costs";
import type { PoolWithScore } from "@shared/schema";

interface PoolsMobileCardsProps {
  pools: PoolWithScore[];
  isLoading: boolean;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function getChainColor(chain: string): string {
  const colors: Record<string, string> = {
    Ethereum: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Arbitrum: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    Optimism: "bg-red-500/10 text-red-600 dark:text-red-400",
    Polygon: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    Base: "bg-blue-600/10 text-blue-700 dark:text-blue-300",
    BSC: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    Avalanche: "bg-red-600/10 text-red-700 dark:text-red-300",
    Solana: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };
  return colors[chain] || "bg-muted text-muted-foreground";
}

export function PoolsMobileCards({ pools, isLoading }: PoolsMobileCardsProps) {
  const { isWatched, toggleWatch } = useWatchlist();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No pools match your filters</p>
        <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="pools-mobile-cards">
      {pools.map((pool) => {
        const watched = isWatched(pool.pool);
        const gas = getGasInfo(pool.chain);
        return (
          <Card
            key={pool.pool}
            className="p-4 hover-elevate"
            data-testid={`card-pool-${pool.pool.slice(0, 8)}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <Badge variant="outline" className={`${getChainColor(pool.chain)} border-0`}>
                  {pool.chain}
                </Badge>
                <span className="text-sm font-medium truncate">{pool.project}</span>
                {pool.isHot && <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
              </div>
              <button
                onClick={() => toggleWatch(pool.pool)}
                title={watched ? "Remove from watchlist" : "Add to watchlist"}
                className="shrink-0 p-1.5 -mr-1 rounded-lg border border-border hover:border-amber-500 hover:bg-amber-500/10 transition-colors"
                aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                data-testid={`button-star-mobile-${pool.pool.slice(0, 8)}`}
              >
                <Star
                  className={`h-5 w-5 ${
                    watched
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm break-all pr-2">{pool.symbol}</span>
              {pool.stablecoin && (
                <Badge variant="secondary" className="text-xs shrink-0">Stable</Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">TVL</p>
                <p className="font-mono text-sm font-semibold">{formatNumber(pool.tvlUsd)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">APY</p>
                <p className="font-mono text-sm font-bold text-chart-2">{pool.apy.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Trend</p>
                <Sparkline
                  apyPct1D={pool.apyPct1D}
                  apyPct7D={pool.apyPct7D}
                  apyPct30D={pool.apyPct30D}
                  currentApy={pool.apy}
                />
              </div>
            </div>

            {/* APY transparency: base vs reward split — blended APY hides this */}
            {(pool.apyBase !== null || pool.apyReward !== null) && (
              <div className="mb-3 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base APY</span>
                  <span className="font-mono font-medium">
                    {(pool.apyBase ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-muted-foreground">Reward APY</span>
                  <span className="font-mono font-medium">
                    {(pool.apyReward ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <Badge
                variant="outline"
                className={
                  pool.ilRisk === "high"
                    ? "border-destructive/40 text-destructive"
                    : pool.ilRisk === "medium"
                    ? "border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
                    : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                }
              >
                IL: {pool.ilRisk === "none" ? "None" : pool.ilRisk}
              </Badge>
              {(pool.isBeefy || pool.autoCompound) && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                >
                  <Check className="h-3 w-3 mr-1" /> Auto
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  gas.level === "high"
                    ? "border-orange-500/40 text-orange-600 dark:text-orange-400"
                    : "border-muted text-muted-foreground"
                }
                title={gas.label}
              >
                Gas: {gas.level === "very-low" ? "Tiny" : gas.level === "low" ? "Low" : gas.level === "medium" ? "Med" : "High"}
              </Badge>
              {/* Sustainability flags — the trust signals retail users ask for */}
              {pool.apyDeclining && (
                <Badge
                  variant="outline"
                  className="border-orange-500/40 text-orange-600 dark:text-orange-400"
                  title="APY declining more than 20% over 7 days"
                >
                  ⚠ APY falling
                </Badge>
              )}
              {pool.lowLiquidityRewards && (
                <Badge
                  variant="outline"
                  className="border-destructive/40 text-destructive"
                  title="Reward tokens may have low liquidity — selling them could move the price"
                >
                  ⚠ Low liq. rewards
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1"
                data-testid={`button-view-mobile-${pool.pool.slice(0, 8)}`}
              >
                <a
                  href={`https://defillama.com/yields/pool/${pool.pool}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View on DeFiLlama
                </a>
              </Button>
              {/* Direct link to the actual pool/protocol page for fast investing */}
              {pool.url && (
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className={
                    pool.isBeefy || pool.autoCompound
                      ? "flex-1 bg-emerald-600 hover:bg-emerald-700"
                      : "flex-1"
                  }
                  data-testid={`button-invest-mobile-${pool.pool.slice(0, 8)}`}
                >
                  <a href={pool.url} target="_blank" rel="noopener noreferrer">
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Invest
                  </a>
                </Button>
              )}
              {!pool.url && (
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className={
                    pool.isBeefy || pool.autoCompound
                      ? "flex-1 bg-emerald-600 hover:bg-emerald-700"
                      : "flex-1"
                  }
                  data-testid={`button-zap-mobile-${pool.pool.slice(0, 8)}`}
                >
                  <a
                    href={
                      pool.isBeefy || pool.autoCompound
                        ? `https://app.beefy.com/#/?search=${encodeURIComponent(pool.symbol)}`
                        : `https://defillama.com/yields/pool/${pool.pool}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {pool.isBeefy || pool.autoCompound ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    )}
                    {pool.isBeefy || pool.autoCompound ? "Zap In" : "View Pool"}
                  </a>
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
