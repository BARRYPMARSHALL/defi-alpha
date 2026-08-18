import { Sparkles, TrendingUp, ArrowRight, ExternalLink, Zap, Shield, Flame, AlertTriangle, ArrowDown, RefreshCw, Check, Leaf, Share2, Heart, Coffee, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MomentumBadge } from "@/components/Sparkline";
import { ShareCallToAction } from "@/components/ShareBar";
import { NexoBanner } from "@/components/NexoBanner";
import { DonationButton } from "@/components/DonationButton";
import type { PoolWithScore } from "@shared/schema";

interface RecommendationsProps {
  pools: PoolWithScore[];
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatApy(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

const BEEFY_CHAIN_SLUGS: Record<string, string> = {
  "Ethereum": "ethereum",
  "Arbitrum": "arbitrum",
  "Optimism": "optimism",
  "Polygon": "polygon",
  "Base": "base",
  "BSC": "bsc",
  "Avalanche": "avax",
  "Fantom": "fantom",
  "Cronos": "cronos",
  "zkSync Era": "zksync",
  "Linea": "linea",
  "Mantle": "mantle",
  "Scroll": "scroll",
  "Mode": "mode",
  "Fraxtal": "fraxtal",
};

function getBeefyChainSlug(chain: string): string {
  return BEEFY_CHAIN_SLUGS[chain] || 'ethereum';
}

function generateInsight(pool: PoolWithScore, allPools: PoolWithScore[]): string {
  const stablePools = allPools.filter(p => p.stablecoin);
  const avgStableApy = stablePools.length > 0 
    ? stablePools.reduce((sum, p) => sum + (p.apy || 0), 0) / stablePools.length 
    : 0;
  
  const sameCategoryPools = allPools.filter(p => 
    p.stablecoin === pool.stablecoin && p.ilRisk === pool.ilRisk
  );
  const avgCategoryApy = sameCategoryPools.length > 0
    ? sameCategoryPools.reduce((sum, p) => sum + (p.apy || 0), 0) / sameCategoryPools.length
    : 0;

  if (pool.stablecoin && avgStableApy > 0) {
    const pctAbove = ((pool.apy - avgStableApy) / avgStableApy) * 100;
    if (pctAbove > 10) {
      return `${Math.round(pctAbove)}% higher APY than avg stablecoin pools`;
    }
  }
  
  if (pool.ilRisk === "none" && pool.apy > avgCategoryApy * 1.1) {
    return "No impermanent loss risk with above-average yield";
  }
  
  if (pool.ilRisk === "low" && pool.tvlUsd > 10000000) {
    return "Low IL risk with strong TVL backing";
  }
  
  if (pool.apyPct7D && pool.apyPct7D > 0.5) {
    return `APY up ${pool.apyPct7D.toFixed(1)}% in the last 7 days`;
  }
  
  if (pool.tvlUsd > 50000000) {
    return "High liquidity pool with proven stability";
  }
  
  if (pool.riskAdjustedScore > 1) {
    return "Strong risk-adjusted returns";
  }
  
  return "Balanced risk-reward profile";
}

function getInsightIcon(pool: PoolWithScore): typeof Zap {
  if (pool.ilRisk === "none") return Shield;
  if (pool.apyPct7D && pool.apyPct7D > 0) return Flame;
  return Zap;
}

export function Recommendations({ pools, isLoading }: RecommendationsProps) {
  const topPools = pools.slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-chart-4" />
            Top Alpha Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              {i < 10 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topPools.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-chart-4" />
            Top Alpha Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recommendations available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-chart-4" />
          Top Alpha Opportunities
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="max-w-[280px]">
              <p>These pools are ranked by risk-adjusted score, which balances APY, TVL (pool size), and impermanent loss risk. Beefy vaults get a bonus for auto-compounding.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topPools.map((pool, index) => (
          <div key={pool.pool}>
            {index === 5 && (
              <div className="mb-4">
                <NexoBanner />
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate" data-testid={`rec-project-${index}`}>
                      {pool.project}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {pool.chain}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 shrink-0">
                    {formatApy(pool.apy)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate font-mono" data-testid={`rec-symbol-${index}`}>
                  {pool.symbol}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-medium">TVL: {formatNumber(pool.tvlUsd)}</span>
                  <span className="text-muted-foreground">|</span>
                  <span>IL: {pool.ilRisk === "none" ? "None" : pool.ilRisk.charAt(0).toUpperCase() + pool.ilRisk.slice(1)}
                    {pool.ilPctActual !== null && pool.ilPctActual !== undefined && (
                      <span> ({pool.ilPctActual.toFixed(2)}%)</span>
                    )}
                  </span>
                  <MomentumBadge apyPct7D={pool.apyPct7D} />
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {pool.stablecoin && (
                    <Badge variant="secondary" className="text-xs">
                      Stable
                    </Badge>
                  )}
                  {pool.isBeefy ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs">
                      <Check className="h-2.5 w-2.5 mr-0.5" />
                      Beefy Vault
                    </Badge>
                  ) : pool.autoCompound ? (
                    <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30 text-xs">
                      <Check className="h-2.5 w-2.5 mr-0.5" />
                      Auto via {pool.autoCompoundProject}
                    </Badge>
                  ) : pool.beefyAvailable ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                      <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                      Beefy Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs text-muted-foreground">
                      Manual Compound
                    </Badge>
                  )}
                  {pool.isHot && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs">
                      <Flame className="h-2.5 w-2.5 mr-0.5" />
                      Hot
                    </Badge>
                  )}
                  {pool.apyDeclining && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                      <ArrowDown className="h-2.5 w-2.5 mr-0.5" />
                      APY Declining
                    </Badge>
                  )}
                  {pool.lowLiquidityRewards && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30 text-xs">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      Low Liq. Rewards
                    </Badge>
                  )}
                </div>
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-muted/50">
                  {(() => {
                    const InsightIcon = getInsightIcon(pool);
                    return <InsightIcon className="h-3 w-3 text-chart-4 mt-0.5 shrink-0" />;
                  })()}
                  <span className="text-xs text-muted-foreground" data-testid={`rec-insight-${index}`}>
                    {generateInsight(pool, pools)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 text-xs"
                    data-testid={`button-rec-view-${index}`}
                  >
                    <a
                      href={`https://defillama.com/yields/pool/${pool.pool}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  </Button>
                  {pool.isBeefy ? (
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      data-testid={`button-rec-zap-beefy-${index}`}
                    >
                      <a
                        href={`https://app.beefy.com/#/${getBeefyChainSlug(pool.chain)}?search=${encodeURIComponent(pool.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Zap via Beefy
                      </a>
                    </Button>
                  ) : pool.autoCompound ? (
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                      className="h-7 text-xs bg-chart-2 hover:bg-chart-2/90"
                      data-testid={`button-rec-zap-auto-${index}`}
                    >
                      <a
                        href={`https://app.beefy.com?search=${encodeURIComponent(pool.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Zap In (Auto)
                      </a>
                    </Button>
                  ) : pool.beefyAvailable ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                      data-testid={`button-rec-check-beefy-${index}`}
                    >
                      <a
                        href={`https://app.beefy.com/#/${getBeefyChainSlug(pool.chain)}?search=${encodeURIComponent(pool.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Beefy
                      </a>
                    </Button>
                  ) : pool.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 text-xs"
                    >
                      <a
                        href={pool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Add Liquidity
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {index < topPools.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        <div className="pt-2 space-y-2">
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Beefy tip:</span> Beefy vaults auto-compound rewards multiple times per day — best for passive yields without gas costs.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-chart-2 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pro tip:</span> Pools are ranked by risk-adjusted returns. Beefy vaults get a ranking boost for passive compounding.
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />
        
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Found something good?
          </p>
          <ShareCallToAction />
        </div>

        <Separator className="my-4" />

        <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shrink-0">
              <Coffee className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                Making gains? Buy me a coffee!
              </p>
            </div>
            <DonationButton variant="compact" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
