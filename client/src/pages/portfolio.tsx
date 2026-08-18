import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Briefcase,
  Shield,
  Scale,
  Zap,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { estimateNetApy, getGasInfo } from "@/lib/gas-costs";
import type { PoolsResponse, PoolWithScore } from "@shared/schema";

type RiskLevel = "conservative" | "balanced" | "aggressive";

interface RiskProfile {
  key: RiskLevel;
  label: string;
  icon: typeof Shield;
  description: string;
  minTvl: number;
  maxApy: number;
  minApy: number;
  preferStable: number;
  preferAutoCompound: boolean;
  excludeHighIl: boolean;
  poolCount: number;
}

const PROFILES: Record<RiskLevel, RiskProfile> = {
  conservative: {
    key: "conservative",
    label: "Conservative",
    icon: Shield,
    description: "Capital preservation first. Stablecoin & blue-chip pools only.",
    minTvl: 50_000_000,
    maxApy: 25,
    minApy: 3,
    preferStable: 0.7,
    preferAutoCompound: true,
    excludeHighIl: true,
    poolCount: 3,
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    icon: Scale,
    description: "Mix of stable yield and growth. Moderate risk.",
    minTvl: 10_000_000,
    maxApy: 60,
    minApy: 5,
    preferStable: 0.4,
    preferAutoCompound: true,
    excludeHighIl: true,
    poolCount: 5,
  },
  aggressive: {
    key: "aggressive",
    label: "Aggressive",
    icon: Zap,
    description: "Chasing yield. Higher APY, higher volatility.",
    minTvl: 1_000_000,
    maxApy: 500,
    minApy: 15,
    preferStable: 0.15,
    preferAutoCompound: false,
    excludeHighIl: false,
    poolCount: 5,
  },
};

interface Allocation {
  pool: PoolWithScore;
  weight: number;
  amount: number;
  netApy: number;
}

function buildAllocation(
  pools: PoolWithScore[],
  profile: RiskProfile,
  amount: number
): Allocation[] {
  const candidates = pools
    .filter((p) => p.tvlUsd >= profile.minTvl)
    .filter((p) => p.apy >= profile.minApy && p.apy <= profile.maxApy)
    .filter((p) => !profile.excludeHighIl || p.ilRisk !== "high")
    .filter((p) => p.riskAdjustedScore > 0);

  if (candidates.length === 0) return [];

  const stableTarget = Math.round(profile.poolCount * profile.preferStable);
  const stables = candidates
    .filter((p) => p.stablecoin)
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, stableTarget);

  const remainingSlots = profile.poolCount - stables.length;
  const others = candidates
    .filter((p) => !stables.includes(p))
    .sort((a, b) => {
      if (profile.preferAutoCompound) {
        const aBoost = a.autoCompound || a.isBeefy ? 1.1 : 1;
        const bBoost = b.autoCompound || b.isBeefy ? 1.1 : 1;
        return b.riskAdjustedScore * bBoost - a.riskAdjustedScore * aBoost;
      }
      return b.riskAdjustedScore - a.riskAdjustedScore;
    })
    .slice(0, remainingSlots);

  const selected = [...stables, ...others];
  if (selected.length === 0) return [];

  const chainCounts = new Map<string, number>();
  const projectCounts = new Map<string, number>();
  const diversified: PoolWithScore[] = [];
  const remainder: PoolWithScore[] = [];
  for (const pool of selected) {
    const chainCount = chainCounts.get(pool.chain) || 0;
    const projectCount = projectCounts.get(pool.project) || 0;
    if (chainCount < 2 && projectCount < 2) {
      diversified.push(pool);
      chainCounts.set(pool.chain, chainCount + 1);
      projectCounts.set(pool.project, projectCount + 1);
    } else {
      remainder.push(pool);
    }
  }

  // If diversification dropped us below the target count, top up from remainder
  while (diversified.length < Math.min(profile.poolCount, selected.length) && remainder.length > 0) {
    diversified.push(remainder.shift()!);
  }

  const final = diversified;

  const totalScore = final.reduce((sum, p) => sum + p.riskAdjustedScore, 0);
  return final.map((pool) => {
    const weight = totalScore > 0 ? pool.riskAdjustedScore / totalScore : 1 / final.length;
    const allocAmount = amount * weight;
    return {
      pool,
      weight,
      amount: allocAmount,
      netApy: estimateNetApy(
        pool.apy,
        pool.chain,
        allocAmount,
        pool.autoCompound || pool.isBeefy
      ),
    };
  });
}

function formatUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Portfolio() {
  const [amountStr, setAmountStr] = useState("5000");
  const [risk, setRisk] = useState<RiskLevel>("balanced");

  const { data, isLoading, refetch, isFetching } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools"],
    refetchInterval: 5 * 60 * 1000,
  });

  const amount = Math.max(0, parseFloat(amountStr) || 0);
  const profile = PROFILES[risk];
  const pools = data?.pools || [];

  const allocations = useMemo(
    () => buildAllocation(pools, profile, amount),
    [pools, profile, amount]
  );

  const blendedApy = useMemo(() => {
    if (allocations.length === 0) return 0;
    return allocations.reduce((sum, a) => sum + a.pool.apy * a.weight, 0);
  }, [allocations]);

  const blendedNetApy = useMemo(() => {
    if (allocations.length === 0 || amount === 0) return 0;
    return allocations.reduce((sum, a) => sum + a.netApy * a.weight, 0);
  }, [allocations, amount]);

  const yearlyReturn = (amount * blendedNetApy) / 100;
  const monthlyReturn = yearlyReturn / 12;
  const dailyReturn = yearlyReturn / 365;

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={() => refetch()} isRefreshing={isFetching} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-portfolio">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Portfolio Builder</h1>
          </div>
        </div>

        <p className="text-muted-foreground max-w-3xl">
          Tell us how much you want to invest and your risk tolerance. We'll build a
          diversified portfolio across the best yield pools, ranked by risk-adjusted score.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Your Inputs</CardTitle>
              <CardDescription>Adjust to see different allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Investment Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="pl-7 text-lg font-semibold"
                    placeholder="5000"
                    data-testid="input-portfolio-amount"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000, 5000, 10000, 25000, 100000].map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAmountStr(String(v))}
                      data-testid={`button-preset-${v}`}
                    >
                      ${v >= 1000 ? `${v / 1000}k` : v}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Tolerance</label>
                <div className="space-y-2">
                  {Object.values(PROFILES).map((p) => {
                    const Icon = p.icon;
                    const active = risk === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setRisk(p.key)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`risk-${p.key}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`h-4 w-4 ${
                              active ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="font-semibold">{p.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <Card className="bg-gradient-to-br from-chart-2/5 to-chart-1/5">
              <CardHeader>
                <CardTitle>Projected Returns</CardTitle>
                <CardDescription>
                  Based on current APYs across {allocations.length} diversified pools
                  {amount > 0 && (
                    <span className="ml-1">
                      (net of estimated gas)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading pool data...
                  </div>
                ) : allocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pools matched this risk profile. Try a different risk level.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Blended APY
                        </p>
                        <p className="text-2xl font-bold text-chart-2" data-testid="text-blended-apy">
                          {blendedApy.toFixed(2)}%
                        </p>
                        {amount > 0 && blendedNetApy < blendedApy && (
                          <p className="text-xs text-muted-foreground">
                            Net: {blendedNetApy.toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Daily
                        </p>
                        <p className="text-lg font-semibold" data-testid="text-daily-return">
                          {formatUsd(dailyReturn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Monthly
                        </p>
                        <p className="text-lg font-semibold" data-testid="text-monthly-return">
                          {formatUsd(monthlyReturn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Yearly
                        </p>
                        <p className="text-lg font-semibold text-chart-2" data-testid="text-yearly-return">
                          {formatUsd(yearlyReturn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-md">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Estimates only. APYs change constantly and are not guaranteed.
                        Net APY accounts for chain gas costs based on your investment size.
                        This is not financial advice.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Allocations */}
            {allocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Allocation</CardTitle>
                  <CardDescription>
                    Weighted by risk-adjusted score, diversified across chains & protocols
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allocations.map((alloc) => {
                    const gas = getGasInfo(alloc.pool.chain);
                    return (
                      <div
                        key={alloc.pool.pool}
                        className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
                        data-testid={`allocation-${alloc.pool.pool.slice(0, 8)}`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{alloc.pool.chain}</Badge>
                              <span className="font-medium">{alloc.pool.project}</span>
                              <span className="font-mono text-sm text-muted-foreground">
                                {alloc.pool.symbol}
                              </span>
                              {(alloc.pool.isBeefy || alloc.pool.autoCompound) && (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Auto
                                </Badge>
                              )}
                              {alloc.pool.stablecoin && (
                                <Badge variant="secondary" className="text-xs">Stable</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold" data-testid={`alloc-amount-${alloc.pool.pool.slice(0, 8)}`}>
                              {formatUsd(alloc.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(alloc.weight * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <Progress value={alloc.weight * 100} className="h-1.5" />

                        <div className="flex items-center justify-between gap-3 text-sm flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                              APY: <span className="font-mono font-semibold text-chart-2">{alloc.pool.apy.toFixed(2)}%</span>
                            </span>
                            {alloc.netApy < alloc.pool.apy && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-xs text-muted-foreground border-b border-dotted">
                                    Net: {alloc.netApy.toFixed(2)}%
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>After estimated gas costs on {alloc.pool.chain}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Gas: {gas.level === "very-low" ? "Tiny" : gas.level === "low" ? "Low" : gas.level === "medium" ? "Med" : "High"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 text-xs"
                            data-testid={`button-view-alloc-${alloc.pool.pool.slice(0, 8)}`}
                          >
                            <a
                              href={`https://defillama.com/yields/pool/${alloc.pool.pool}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Details
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
