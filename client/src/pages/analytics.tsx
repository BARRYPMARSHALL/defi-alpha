import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Shield, Zap, Layers, DollarSign, Info } from "lucide-react";
import { DonationButton, DonationBanner } from "@/components/DonationButton";
import { FloatingDonateButton } from "@/components/FloatingDonateButton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import type { PoolsResponse, PoolWithScore } from "@shared/schema";

function formatTvl(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function calculateApyDistribution(pools: PoolWithScore[]) {
  const buckets = [
    { range: "0-5%", min: 0, max: 5, count: 0 },
    { range: "5-10%", min: 5, max: 10, count: 0 },
    { range: "10-20%", min: 10, max: 20, count: 0 },
    { range: "20-50%", min: 20, max: 50, count: 0 },
    { range: "50-100%", min: 50, max: 100, count: 0 },
    { range: "100%+", min: 100, max: Infinity, count: 0 },
  ];

  pools.forEach((pool) => {
    const apy = pool.apy;
    for (const bucket of buckets) {
      if (apy >= bucket.min && apy < bucket.max) {
        bucket.count++;
        break;
      }
    }
  });

  return buckets;
}

function calculateChainMetrics(pools: PoolWithScore[]) {
  const chainData: Record<string, { tvl: number; count: number; totalApy: number }> = {};

  pools.forEach((pool) => {
    if (!chainData[pool.chain]) {
      chainData[pool.chain] = { tvl: 0, count: 0, totalApy: 0 };
    }
    chainData[pool.chain].tvl += pool.tvlUsd;
    chainData[pool.chain].count++;
    chainData[pool.chain].totalApy += pool.apy;
  });

  return Object.entries(chainData)
    .map(([chain, data]) => ({
      chain,
      tvl: data.tvl,
      count: data.count,
      avgApy: data.totalApy / data.count,
    }))
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10);
}

function calculateProtocolRankings(pools: PoolWithScore[]) {
  const protocolData: Record<string, { tvl: number; count: number; avgApy: number; totalApy: number }> = {};

  pools.forEach((pool) => {
    if (!protocolData[pool.project]) {
      protocolData[pool.project] = { tvl: 0, count: 0, avgApy: 0, totalApy: 0 };
    }
    protocolData[pool.project].tvl += pool.tvlUsd;
    protocolData[pool.project].count++;
    protocolData[pool.project].totalApy += pool.apy;
  });

  return Object.entries(protocolData)
    .map(([project, data]) => ({
      project,
      tvl: data.tvl,
      count: data.count,
      avgApy: data.totalApy / data.count,
    }))
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10);
}

function calculateRiskDistribution(pools: PoolWithScore[]) {
  const riskData = {
    low: { count: 0, tvl: 0 },
    medium: { count: 0, tvl: 0 },
    high: { count: 0, tvl: 0 },
  };

  pools.forEach((pool) => {
    const risk = pool.ilRisk === "none" ? "low" : pool.ilRisk;
    if (risk in riskData) {
      riskData[risk as keyof typeof riskData].count++;
      riskData[risk as keyof typeof riskData].tvl += pool.tvlUsd;
    }
  });

  return [
    { name: "Low Risk", count: riskData.low.count, tvl: riskData.low.tvl, fill: "hsl(var(--chart-2))" },
    { name: "Medium Risk", count: riskData.medium.count, tvl: riskData.medium.tvl, fill: "hsl(var(--chart-4))" },
    { name: "High Risk", count: riskData.high.count, tvl: riskData.high.tvl, fill: "hsl(var(--chart-1))" },
  ];
}

function calculateTopMovers(pools: PoolWithScore[]) {
  const withChange = pools.filter((p) => p.apyPct7D !== null && p.apyPct7D !== 0);
  
  const gainers = [...withChange]
    .sort((a, b) => (b.apyPct7D || 0) - (a.apyPct7D || 0))
    .slice(0, 5);
  
  const losers = [...withChange]
    .sort((a, b) => (a.apyPct7D || 0) - (b.apyPct7D || 0))
    .slice(0, 5);

  return { gainers, losers };
}

function calculatePoolTypeComparison(pools: PoolWithScore[]) {
  const stablePools = pools.filter((p) => p.stablecoin);
  const volatilePools = pools.filter((p) => !p.stablecoin);
  const autoCompoundPools = pools.filter((p) => p.autoCompound);
  const manualPools = pools.filter((p) => !p.autoCompound);

  const avgApy = (arr: PoolWithScore[]) => arr.length ? arr.reduce((s, p) => s + p.apy, 0) / arr.length : 0;
  const totalTvl = (arr: PoolWithScore[]) => arr.reduce((s, p) => s + p.tvlUsd, 0);

  return {
    stableVsVolatile: [
      { name: "Stablecoins", avgApy: avgApy(stablePools), tvl: totalTvl(stablePools), count: stablePools.length },
      { name: "Volatile", avgApy: avgApy(volatilePools), tvl: totalTvl(volatilePools), count: volatilePools.length },
    ],
    autoVsManual: [
      { name: "Auto-Compound", avgApy: avgApy(autoCompoundPools), tvl: totalTvl(autoCompoundPools), count: autoCompoundPools.length },
      { name: "Manual", avgApy: avgApy(manualPools), tvl: totalTvl(manualPools), count: manualPools.length },
    ],
  };
}

function calculateYieldTrends(pools: PoolWithScore[]) {
  const withTrends = pools.filter(
    (p) => p.apyPct1D !== null && p.apyPct7D !== null && p.apyPct30D !== null
  );

  if (withTrends.length === 0) return null;

  const avg1D = withTrends.reduce((s, p) => s + (p.apyPct1D || 0), 0) / withTrends.length;
  const avg7D = withTrends.reduce((s, p) => s + (p.apyPct7D || 0), 0) / withTrends.length;
  const avg30D = withTrends.reduce((s, p) => s + (p.apyPct30D || 0), 0) / withTrends.length;

  return [
    { period: "30D Avg", change: avg30D },
    { period: "7D Avg", change: avg7D },
    { period: "1D Avg", change: avg1D },
  ];
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

interface StablecoinChainData {
  chain: string;
  totalCirculatingUSD: number;
}

interface StablecoinsResponse {
  success: boolean;
  data: StablecoinChainData[];
  lastUpdated: string;
}

export default function Analytics() {
  const { data, isLoading } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/pools?minTvl=1000000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: stablecoinsData, isLoading: stablecoinsLoading } = useQuery<StablecoinsResponse>({
    queryKey: ["/api/stablecoins"],
    queryFn: async () => {
      const res = await fetch("/api/stablecoins", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stablecoins");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const pools = data?.pools || [];
  const apyDistribution = calculateApyDistribution(pools);
  const chainMetrics = calculateChainMetrics(pools);
  const protocolRankings = calculateProtocolRankings(pools);
  const riskDistribution = calculateRiskDistribution(pools);
  const { gainers, losers } = calculateTopMovers(pools);
  const poolTypeComparison = calculatePoolTypeComparison(pools);
  const yieldTrends = calculateYieldTrends(pools);

  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0);
  const avgApy = pools.length ? pools.reduce((s, p) => s + p.apy, 0) / pools.length : 0;
  const autoCompoundCount = pools.filter((p) => p.autoCompound).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-analytics-title">DeFi Analytics</h1>
              <p className="text-sm text-muted-foreground">Comprehensive yield and market insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span data-testid="text-pool-count">{pools.length.toLocaleString()} pools analyzed</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Layers className="h-4 w-4" />
                Total TVL
              </div>
              <div className="text-2xl font-bold" data-testid="text-total-tvl">
                {isLoading ? <Skeleton className="h-8 w-24" /> : formatTvl(totalTvl)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Avg APY
              </div>
              <div className="text-2xl font-bold" data-testid="text-avg-apy">
                {isLoading ? <Skeleton className="h-8 w-20" /> : formatPercent(avgApy)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Zap className="h-4 w-4" />
                Auto-Compound
              </div>
              <div className="text-2xl font-bold" data-testid="text-auto-compound">
                {isLoading ? <Skeleton className="h-8 w-16" /> : autoCompoundCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <BarChart3 className="h-4 w-4" />
                Chains
              </div>
              <div className="text-2xl font-bold" data-testid="text-chain-count">
                {isLoading ? <Skeleton className="h-8 w-12" /> : chainMetrics.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <DonationBanner />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadingCard title="APY Distribution" />
            <LoadingCard title="TVL by Chain" />
            <LoadingCard title="Risk Distribution" />
            <LoadingCard title="Protocol Rankings" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-apy-distribution">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  APY Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={apyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Pools" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-tvl-by-chain">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  TVL by Chain (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chainMetrics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => formatTvl(v)} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis dataKey="chain" type="category" width={80} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number) => formatTvl(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="tvl" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="TVL" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-risk-distribution">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value} pools (${formatTvl(props.payload.tvl)})`,
                        name
                      ]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-top-protocols">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Top Protocols by TVL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={protocolRankings} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => formatTvl(v)} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis dataKey="project" type="category" width={90} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatTvl(value), name]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="tvl" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="TVL" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-top-gainers">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top 5 Gainers (7D)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gainers.map((pool, i) => (
                    <div key={pool.pool} className="flex items-center justify-between text-sm" data-testid={`row-gainer-${i}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-muted-foreground w-5">{i + 1}.</span>
                        <span className="truncate font-medium" data-testid={`text-gainer-symbol-${i}`}>{pool.symbol}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">({pool.chain})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground" data-testid={`text-gainer-apy-${i}`}>{formatPercent(pool.apy)}</span>
                        <span className="text-green-500 font-medium flex items-center gap-1" data-testid={`text-gainer-change-${i}`}>
                          <TrendingUp className="h-3 w-3" />
                          +{formatPercent(pool.apyPct7D || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {gainers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No trend data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-top-losers">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Top 5 Losers (7D)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {losers.map((pool, i) => (
                    <div key={pool.pool} className="flex items-center justify-between text-sm" data-testid={`row-loser-${i}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-muted-foreground w-5">{i + 1}.</span>
                        <span className="truncate font-medium" data-testid={`text-loser-symbol-${i}`}>{pool.symbol}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">({pool.chain})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground" data-testid={`text-loser-apy-${i}`}>{formatPercent(pool.apy)}</span>
                        <span className="text-red-500 font-medium flex items-center gap-1" data-testid={`text-loser-change-${i}`}>
                          <TrendingDown className="h-3 w-3" />
                          {formatPercent(pool.apyPct7D || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {losers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No trend data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stable-vs-volatile">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Stablecoin vs Volatile Pools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {poolTypeComparison.stableVsVolatile.map((item, i) => (
                    <div key={item.name} className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{formatPercent(item.avgApy)}</div>
                      <div className="text-xs text-muted-foreground">Avg APY</div>
                      <div className="text-sm font-medium mt-1">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.count} pools</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={poolTypeComparison.stableVsVolatile}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tickFormatter={(v) => formatTvl(v)} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number) => formatTvl(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="tvl" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="TVL" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-auto-vs-manual">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-Compound vs Manual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {poolTypeComparison.autoVsManual.map((item) => (
                    <div key={item.name} className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">{formatPercent(item.avgApy)}</div>
                      <div className="text-xs text-muted-foreground">Avg APY</div>
                      <div className="text-sm font-medium mt-1">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.count} pools</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={poolTypeComparison.autoVsManual}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tickFormatter={(v) => formatTvl(v)} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number) => formatTvl(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="tvl" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="TVL" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2" data-testid="card-avg-apy-by-chain">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Average APY by Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chainMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="chain" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number) => formatPercent(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="avgApy" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Avg APY" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2" data-testid="card-stablecoins-by-chain">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Stablecoins by Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stablecoinsLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : stablecoinsData?.data && stablecoinsData.data.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stablecoinsData.data.slice(0, 12)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tickFormatter={(v) => formatTvl(v)} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis dataKey="chain" type="category" width={85} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <Tooltip 
                          formatter={(value: number) => formatTvl(value)}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="totalCirculatingUSD" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Stablecoin Supply" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Total stablecoin supply on each blockchain (USDT, USDC, DAI, etc.)
                    </p>
                  </>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Unable to load stablecoin data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-teal-500/5 border-blue-500/20" data-testid="card-stablecoin-explainer">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Info className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Why Stablecoin Supply Matters for Yield Farming</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Chains with more stablecoins typically offer <strong>deeper liquidity and more sustainable yields</strong>. 
                      High stablecoin supply means larger pools, lower slippage, and more lending/borrowing activity. 
                      When you see a chain with high stablecoin supply, it's a sign that capital is flowing there, 
                      which often means better opportunities for consistent returns. Top chains like Ethereum and Tron 
                      tend to have more established protocols and liquidity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {yieldTrends && (
              <Card className="lg:col-span-2" data-testid="card-market-apy-trend">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Market-Wide APY Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4 sm:gap-8 py-6 flex-wrap">
                    {yieldTrends.map((item) => (
                      <div key={item.period} className="text-center min-w-[80px]">
                        <div className={`text-xl sm:text-2xl font-bold ${item.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {item.change >= 0 ? "+" : ""}{formatPercent(item.change)}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{item.period}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Average APY change across all pools over different time periods
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="lg:col-span-2 bg-gradient-to-r from-pink-500/5 via-rose-500/5 to-orange-500/5 border-pink-500/20" data-testid="card-support-cta">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Enjoying these insights?</h3>
                    <p className="text-sm text-muted-foreground">
                      Help us keep the analytics free and updated. Every contribution helps!
                    </p>
                  </div>
                  <DonationButton variant="floating" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t mt-6">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
            <p>
              Data from{" "}
              <a
                href="https://defillama.com/yields"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                DeFiLlama
              </a>
            </p>
            <p>Auto-refreshes every 5 minutes</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Follow</span>
              <a
                href="https://x.com/defialphaagent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-follow-twitter-analytics"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @DefiAlphaAgent
              </a>
              <span>for daily alerts</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <div className="flex items-center gap-2">
              <span>Business Inquiries:</span>
              <a
                href="https://x.com/defialphaagent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-contact-twitter-analytics"
              >
                DM @DefiAlphaAgent
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <DonationButton variant="inline" />
          </div>
        </div>
      </footer>

      <FloatingDonateButton />
    </div>
  );
}
