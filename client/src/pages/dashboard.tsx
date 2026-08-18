import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, ArrowUpRight, Layers, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { AlphaBrainPanel } from "@/components/AlphaBrainPanel";
import { AlertBell } from "@/components/AlertBell";
import { SummaryCards } from "@/components/SummaryCards";
import { PoolsMobileCards } from "@/components/PoolsMobileCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PoolsResponse } from "@shared/schema";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function Dashboard() {
  const isMobile = useIsMobile();

  const { data, isLoading, isFetching, refetch } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", "home"],
    queryFn: async () => {
      const res = await fetch("/api/pools?sortField=riskAdjustedScore&sortDirection=desc", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch pools: ${res.status}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const pools = data?.pools || [];
  const stats = data?.stats || { totalPools: 0, avgApy: 0, topChain: "-", topChainTvl: 0 };
  const topPicks = pools.filter((p) => p.riskAdjustedScore > 0).slice(0, 5);
  const hotPicks = pools.filter((p) => p.isHot).slice(0, 5);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        lastUpdated={data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : null}
        rightSlot={<AlertBell />}
      />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* Value proposition — one line, no giant hero image */}
        <section className="pt-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find the safest high yields in DeFi
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-2xl">
            {stats.totalPools.toLocaleString() || "15,000+"} pools scored by real risk-adjusted return.
            Ask Alpha Brain what to do with your money.
          </p>
        </section>

        {/* Alpha Brain — the moat, front and center */}
        <section>
          <AlphaBrainPanel />
        </section>

        {/* Summary stats */}
        <SummaryCards
          totalPools={stats.totalPools}
          avgApy={stats.avgApy}
          topChain={stats.topChain}
          topChainTvl={stats.topChainTvl}
          isLoading={isLoading}
        />

        {/* Top picks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top opportunities
            </h2>
            <Link href="/yields">
              <Button variant="ghost" size="sm" className="text-primary">
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {topPicks.slice(0, 3).map((pool, i) => (
                <Card key={pool.pool} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{pool.symbol}</span>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {pool.chain}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {pool.project}
                          {pool.isBeefy ? " · 🔄 Beefy" : pool.autoCompound ? " · 🔄 auto-compound" : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-500">{pool.apy.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">
                          {pool.tvlUsd >= 1e9
                            ? `$${(pool.tvlUsd / 1e9).toFixed(1)}B`
                            : pool.tvlUsd >= 1e6
                              ? `$${(pool.tvlUsd / 1e6).toFixed(1)}M`
                              : `$${(pool.tvlUsd / 1e3).toFixed(0)}K`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Hot pools quick strip (mobile-friendly horizontal scroll) */}
        {hotPicks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Hot right now
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {hotPicks.map((pool) => (
                <Card key={pool.pool} className="shrink-0 w-40 snap-start">
                  <CardContent className="p-3">
                    <div className="text-sm font-semibold truncate">{pool.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate mb-1">{pool.project}</div>
                    <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {pool.apy.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{pool.chain}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Mobile: compact pool list */}
        {isMobile && pools.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">All pools</h2>
              <Link href="/yields">
                <Button variant="ghost" size="sm" className="text-primary">
                  Browse <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <PoolsMobileCards pools={pools.slice(0, 6)} isLoading={false} />
          </section>
        )}
      </main>
    </div>
  );
}
