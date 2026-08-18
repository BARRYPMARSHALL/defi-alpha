import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Shield, ExternalLink, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { PoolsResponse, PoolWithScore } from "@shared/schema";

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export default function Stablecoins() {
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("all");

  const { data, isLoading, refetch, isFetching } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools"],
    refetchInterval: 5 * 60 * 1000,
  });

  const stablePools = useMemo(() => {
    const pools = (data?.pools || []).filter(
      (p) => p.stablecoin && p.apy > 0 && p.apy < 1000 && p.tvlUsd >= 100_000
    );
    return pools.sort((a, b) => b.apy - a.apy);
  }, [data]);

  const chains = useMemo(() => {
    const set = new Set<string>();
    stablePools.forEach((p) => set.add(p.chain));
    return Array.from(set).sort();
  }, [stablePools]);

  const filtered = useMemo(() => {
    return stablePools.filter((p) => {
      if (chainFilter !== "all" && p.chain !== chainFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.project.toLowerCase().includes(q) ||
          p.symbol.toLowerCase().includes(q) ||
          p.chain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stablePools, chainFilter, search]);

  const top = filtered.slice(0, 50);

  const stats = useMemo(() => {
    if (stablePools.length === 0) return { count: 0, avgApy: 0, totalTvl: 0, top: 0 };
    const totalTvl = stablePools.reduce((sum, p) => sum + p.tvlUsd, 0);
    const avgApy = stablePools.reduce((sum, p) => sum + p.apy, 0) / stablePools.length;
    const topApy = Math.max(...stablePools.map((p) => p.apy));
    return { count: stablePools.length, avgApy, totalTvl, top: topApy };
  }, [stablePools]);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header onRefresh={() => refetch()} isRefreshing={isFetching} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Stablecoin Yield Leaderboard</h1>
        </div>

        <p className="text-muted-foreground max-w-3xl">
          The highest-yielding stablecoin pools across every chain. Earn passive income
          on USDC, USDT, DAI, and other dollar-pegged assets without exposure to crypto
          price swings.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Stable Pools</p>
              <div className="text-2xl font-bold" data-testid="text-stable-count">
                {isLoading ? <Skeleton className="h-8 w-20" /> : stats.count.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Average APY</p>
              <div className="text-2xl font-bold text-chart-2" data-testid="text-stable-avg-apy">
                {isLoading ? <Skeleton className="h-8 w-20" /> : `${stats.avgApy.toFixed(2)}%`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Top APY</p>
              <div className="text-2xl font-bold text-chart-2" data-testid="text-stable-top-apy">
                {isLoading ? <Skeleton className="h-8 w-20" /> : `${stats.top.toFixed(2)}%`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Total Stable TVL</p>
              <div className="text-2xl font-bold" data-testid="text-stable-total-tvl">
                {isLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(stats.totalTvl)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Top 50 Stablecoin Pools
            </CardTitle>
            <CardDescription>
              Sorted by APY. All pools below hold dollar-pegged assets only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search project, symbol, chain..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-stable-search"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={chainFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChainFilter("all")}
                  data-testid="chain-filter-all"
                >
                  All
                </Button>
                {chains.slice(0, 8).map((c) => (
                  <Button
                    key={c}
                    variant={chainFilter === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChainFilter(c)}
                    data-testid={`chain-filter-${c.toLowerCase()}`}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">TVL</TableHead>
                    <TableHead className="text-right">APY</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : top.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No stablecoin pools match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    top.map((pool: PoolWithScore, idx) => (
                      <TableRow
                        key={pool.pool}
                        className="hover-elevate"
                        data-testid={`row-stable-${pool.pool.slice(0, 8)}`}
                      >
                        <TableCell className="text-center font-semibold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pool.chain}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{pool.project}</TableCell>
                        <TableCell className="font-mono text-sm">{pool.symbol}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(pool.tvlUsd)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-chart-2">
                          {pool.apy.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild data-testid={`button-view-stable-${pool.pool.slice(0, 8)}`}>
                            <a
                              href={`https://defillama.com/yields/pool/${pool.pool}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
