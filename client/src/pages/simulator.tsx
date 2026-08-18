import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Crown, TrendingUp, Share2, Check, Scale, Coins } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { estimateNetApy } from "@/lib/gas-costs";
import { formatApy } from "@/lib/format";
import type { PoolsResponse, PoolWithScore } from "@shared/schema";

interface Allocation {
  poolId: string;
  weight: number; // percentage 0-100
}

const FREE_POOL_LIMIT = 3;
const DEFAULT_INVESTMENT = 10000;

function poolKey(pool: PoolWithScore): string {
  return pool.pool;
}

export default function SimulatorPage() {
  const { user, isPro } = useAuth();
  const { toast } = useToast();

  const [investment, setInvestment] = useState(DEFAULT_INVESTMENT);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", "simulator"],
    queryFn: async () => {
      const res = await fetch("/api/pools?sortField=riskAdjustedScore&sortDirection=desc", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const pools = data?.pools || [];
  const limit = isPro ? Infinity : FREE_POOL_LIMIT;

  const searchable = useMemo(() => {
    if (!search.trim()) return pools.slice(0, 20);
    const q = search.toLowerCase();
    return pools
      .filter((p) => `${p.symbol} ${p.project} ${p.chain}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [pools, search]);

  const poolById = useMemo(() => new Map(pools.map((p) => [poolKey(p), p])), [pools]);

  const addPool = (pool: PoolWithScore) => {
    if (allocations.length >= limit) {
      // Only free users can hit this (Pro limit is Infinity)
      toast({
        title: "Free plan limit",
        description: `Free plan allows ${FREE_POOL_LIMIT} pools. Upgrade to Pro for unlimited.`,
      });
      return;
    }
    if (allocations.some((a) => a.poolId === poolKey(pool))) return;
    const currentTotal = allocations.reduce((s, a) => s + a.weight, 0);
    const remaining = 100 - currentTotal;
    // Never exceed 100%: if nothing is left, don't add (the row would be 0%).
    if (remaining <= 0) {
      toast({
        title: "Allocation full",
        description: "Weights already total 100% — adjust an existing pool first.",
      });
      return;
    }
    // Even split of what's left, no forced minimum (never exceed 100%)
    const weight = Math.max(1, Math.min(remaining, Math.floor(remaining / (allocations.length + 1))));
    setAllocations((prev) => [...prev, { poolId: poolKey(pool), weight }]);
  };

  const removePool = (poolId: string) => {
    setAllocations((prev) => prev.filter((a) => a.poolId !== poolId));
  };

  const setWeight = (poolId: string, weight: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.poolId === poolId ? { ...a, weight: Math.max(0, Math.min(100, weight)) } : a)),
    );
  };

  const totalWeight = allocations.reduce((s, a) => s + a.weight, 0);

  const result = useMemo(() => {
    if (allocations.length === 0 || investment <= 0) return null;

    const totalW = totalWeight || 100; // normalize: weights need not sum to 100

    let blendedNet = 0;
    let blendedGross = 0;
    let ilAdjusted = 0;
    const perPool = allocations.map((a) => {
      const pool = poolById.get(a.poolId);
      if (!pool) return null;
      const weightFrac = a.weight / totalW; // proportional share
      const usd = investment * weightFrac;
      const netApy = estimateNetApy(pool.apy, pool.chain, usd, pool.autoCompound || pool.isBeefy);
      // IL penalty applied to net APY (post-gas) for the truest picture
      const ilPenalty = pool.ilRisk === "high" ? 0.5 : pool.ilRisk === "medium" ? 0.25 : pool.ilRisk === "low" ? 0.1 : 0;
      const ilAdjNet = netApy * (1 - ilPenalty);
      blendedGross += pool.apy * weightFrac;
      blendedNet += netApy * weightFrac;
      ilAdjusted += ilAdjNet * weightFrac;
      return { pool, usd, netApy, ilAdjNet };
    }).filter(Boolean) as { pool: PoolWithScore; usd: number; netApy: number; ilAdjNet: number }[];

    const yearlyReturn = investment * (ilAdjusted / 100);
    const monthlyReturn = yearlyReturn / 12;
    const dailyReturn = yearlyReturn / 365;

    return { perPool, blendedGross, blendedNet, ilAdjusted, yearlyReturn, monthlyReturn, dailyReturn };
  }, [allocations, investment, poolById, totalWeight]);

  const handleShare = async () => {
    if (!result) return;
    const text = `My DeFi Alpha simulated portfolio: ${formatApy(result.ilAdjusted)} IL-adjusted net APY on $${investment.toLocaleString()} across ${result.perPool.length} pools.`;
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "DeFi Alpha Portfolio Simulator", text, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      toast({ title: "Copied!", description: "Portfolio summary copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Portfolio Simulator</h1>
          {!isPro && (
            <Link href="/checkout">
              <Badge variant="outline" className="ml-1 cursor-pointer border-amber-500/40 text-amber-600 dark:text-amber-400">
                <Crown className="h-3 w-3 mr-1" /> Free: {allocations.length}/{FREE_POOL_LIMIT} pools
              </Badge>
            </Link>
          )}
          {isPro && (
            <Badge className="ml-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
              <Crown className="h-3 w-3 mr-1" /> Pro: unlimited pools
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Pick pools, set your investment, and see the blended net APY after gas and impermanent-loss
          risk. A what-if for your money — no deposits needed.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: pool picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">1. Add pools</CardTitle>
              <CardDescription>Search and add up to {isPro ? "unlimited" : FREE_POOL_LIMIT} pools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token, project, or chain…"
                className="h-10"
                aria-label="Search pools"
              />

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchable.map((pool) => {
                    const added = allocations.some((a) => a.poolId === poolKey(pool));
                    return (
                      <div key={poolKey(pool)} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{pool.symbol}</span>
                            <Badge variant="outline" className="text-[9px] shrink-0">{pool.chain}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {pool.project} · {formatApy(pool.apy)} · IL {pool.ilRisk}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={added ? "ghost" : "default"}
                          onClick={() => (added ? removePool(poolKey(pool)) : addPool(pool))}
                          className="shrink-0"
                          aria-label={added ? `Remove ${pool.symbol} from portfolio` : `Add ${pool.symbol} to portfolio`}
                        >
                          {added ? <Trash2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    );
                  })}
                  {searchable.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No pools match "{search}"</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: allocations + result */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">2. Allocate & invest</CardTitle>
                <CardDescription>Investment amount (USD)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="number"
                  value={investment}
                  onChange={(e) => setInvestment(Math.max(0, Number(e.target.value) || 0))}
                  min={0}
                  className="h-10 w-full"
                  aria-label="Investment amount in USD"
                />

                {allocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Add pools on the left to start simulating.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((a) => {
                      const pool = poolById.get(a.poolId);
                      if (!pool) return null;
                      return (
                        <div key={a.poolId} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {pool.symbol} <span className="text-muted-foreground">({pool.chain})</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{a.weight}%</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePool(a.poolId)} aria-label={`Remove ${pool.symbol} from portfolio`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="range"
                              min={0}
                              max={100}
                              value={a.weight}
                              onChange={(e) => setWeight(a.poolId, Number(e.target.value))}
                              className="flex-1"
                              aria-label={`Weight for ${pool.symbol}`}
                            />
                            <span className="text-xs font-mono w-10 text-right">{a.weight}%</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatApy(pool.apy)} gross</span>
                            <span>${((investment * a.weight) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total allocated</span>
                      <span className={`font-mono ${totalWeight === 100 ? "text-emerald-600 dark:text-emerald-400" : totalWeight > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight !== 100 && (
                      <p className="text-xs text-muted-foreground">
                        {totalWeight < 100
                          ? `Tip: adjust weights so the total is 100%. Unallocated ${(100 - totalWeight).toFixed(0)}% sits as cash.`
                          : "Weights total over 100% — results are normalized proportionally."}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Result */}
            {result && (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Simulated result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-emerald-500">{formatApy(result.ilAdjusted)}</p>
                    <p className="text-xs text-muted-foreground">
                      IL-adjusted net APY (after gas, before taxes)
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-semibold">${result.dailyReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">per day</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-semibold">${result.monthlyReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">per month</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-semibold">${result.yearlyReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">per year</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {result.perPool.map(({ pool, netApy, ilAdjNet }) => (
                      <div key={poolKey(pool)} className="flex items-center justify-between text-xs">
                        <span className="truncate">{pool.symbol}</span>
                        <span className="font-mono text-muted-foreground">{formatApy(netApy)} → {formatApy(ilAdjNet)} adj</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleShare}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Share result"}
                    </Button>
                    <Button asChild size="sm" variant={isPro ? "outline" : "default"} className="flex-1 gap-1">
                      <Link href="/checkout">
                        <Crown className="h-3.5 w-3.5" />
                        {isPro ? "Manage Pro" : "Unlock unlimited pools"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Coins className="h-3 w-3 inline mr-1" />
          Simulation only — not financial advice. APYs move; always verify before depositing.
        </p>
      </main>
    </div>
  );
}
