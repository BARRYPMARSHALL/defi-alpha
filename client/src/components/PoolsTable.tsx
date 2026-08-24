import { ExternalLink, Flame, TrendingDown, TrendingUp, Zap, AlertTriangle, ArrowDown, Check, X, RefreshCw, Share2, Star } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { SharePoolButton } from "@/components/ShareBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkline } from "@/components/Sparkline";
import type { PoolWithScore, SortState } from "@shared/schema";

interface PoolsTableProps {
  pools: PoolWithScore[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  isLoading: boolean;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatApy(apy: number | null | undefined): string {
  if (apy === null || apy === undefined) return "-";
  return `${apy.toFixed(2)}%`;
}

function getIlBadgeVariant(risk: string): "default" | "secondary" | "destructive" | "outline" {
  switch (risk) {
    case "none":
      return "secondary";
    case "low":
      return "outline";
    case "medium":
      return "default";
    case "high":
      return "destructive";
    default:
      return "secondary";
  }
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
    Fantom: "bg-blue-400/10 text-blue-500 dark:text-blue-300",
    Solana: "bg-gradient-to-r from-purple-500/10 to-cyan-500/10 text-purple-600 dark:text-purple-400",
  };
  return colors[chain] || "bg-muted text-muted-foreground";
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

function getBeefyUrl(pool: PoolWithScore): string {
  const chainSlug = BEEFY_CHAIN_SLUGS[pool.chain] || 'ethereum';
  return `https://app.beefy.com/#/${chainSlug}?search=${encodeURIComponent(pool.symbol)}`;
}

function getAutoCompoundUrl(pool: PoolWithScore): string {
  if (pool.isBeefy || pool.autoCompoundProject?.toLowerCase() === 'beefy') {
    return getBeefyUrl(pool);
  }
  
  const projectUrls: Record<string, string> = {
    "yearn-finance": "https://yearn.fi/vaults",
    "convex-finance": "https://www.convexfinance.com/stake",
    "gamma": "https://app.gamma.xyz",
    "arrakis": "https://app.arrakis.fi",
    "reaper-farm": "https://reaper.farm",
    "autofarm": "https://autofarm.network",
    "concentrator": "https://concentrator.aladdin.club",
    "origin-dollar": "https://app.oeth.com",
    "aura": "https://app.aura.finance",
    "pendle": "https://app.pendle.finance/trade/pools",
    "sommelier": "https://app.sommelier.finance",
  };
  
  const projectLower = pool.project.toLowerCase();
  return projectUrls[projectLower] || getBeefyUrl(pool);
}

function getProtocolUrl(pool: PoolWithScore): string {
  const protocolUrls: Record<string, string> = {
    "uniswap-v3": "https://app.uniswap.org/pools",
    "uniswap-v2": "https://app.uniswap.org/pools",
    "curve-dex": "https://curve.fi",
    "aave-v3": "https://app.aave.com",
    "aave-v2": "https://app.aave.com",
    "compound-v3": "https://app.compound.finance",
    "compound-v2": "https://app.compound.finance",
    "convex-finance": "https://www.convexfinance.com/stake",
    "yearn-finance": "https://yearn.fi/vaults",
    "balancer-v2": "https://app.balancer.fi",
    "sushiswap": "https://www.sushi.com/pool",
    "pancakeswap-amm-v3": "https://pancakeswap.finance/liquidity",
    "pancakeswap-amm-v2": "https://pancakeswap.finance/liquidity",
    "raydium-amm": "https://raydium.io/liquidity",
    "orca-dex": "https://www.orca.so/pools",
    "kamino-liquidity": "https://app.kamino.finance/liquidity",
    "morpho-v1": "https://app.morpho.org",
    "morpho-blue": "https://app.morpho.org",
    "pendle": "https://app.pendle.finance/trade/pools",
    "lido": "https://stake.lido.fi",
    "rocket-pool": "https://stake.rocketpool.net",
    "gmx": "https://app.gmx.io",
    "velodrome-v2": "https://velodrome.finance/liquidity",
    "aerodrome-v1": "https://aerodrome.finance/liquidity",
    "trader-joe-dex": "https://traderjoexyz.com/avalanche/pool",
    "camelot-v3": "https://app.camelot.exchange/liquidity",
    "stargate": "https://stargate.finance/pool",
    "spark": "https://app.spark.fi",
    "fluid": "https://fluid.instadapp.io",
    "eigenlayer": "https://app.eigenlayer.xyz",
    "hyperliquid": "https://app.hyperliquid.xyz",
  };
  
  const baseUrl = protocolUrls[pool.project] || `https://defillama.com/yields/pool/${pool.pool}`;
  return baseUrl;
}

export function PoolsTable({
  pools,
  sort,
  onSortChange,
  isLoading,
}: PoolsTableProps) {
  const { isWatched, toggleWatch } = useWatchlist();
  const handleSort = (field: SortState["field"]) => {
    if (sort.field === field) {
      onSortChange({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ field, direction: "desc" });
    }
  };

  const SortableHeader = ({
    field,
    children,
    className = "",
    tooltip,
  }: {
    field: SortState["field"];
    children: React.ReactNode;
    className?: string;
    tooltip?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover-elevate ${className}`}
      onClick={() => handleSort(field)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {children}
            {sort.field === field && (
              <span className="text-primary">
                {sort.direction === "desc" ? "↓" : "↑"}
              </span>
            )}
          </div>
        </TooltipTrigger>
        {tooltip && <TooltipContent side="bottom" align="center" className="max-w-[250px]"><p>{tooltip}</p></TooltipContent>}
      </Tooltip>
    </TableHead>
  );
  
  const HeaderWithTooltip = ({
    children,
    tooltip,
    className = "",
  }: {
    children: React.ReactNode;
    tooltip: string;
    className?: string;
  }) => (
    <TableHead className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="max-w-[250px]"><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Chain</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">TVL</TableHead>
              <TableHead className="text-right">APY</TableHead>
              <TableHead className="text-center">Trend</TableHead>
              <TableHead>IL Risk</TableHead>
              <TableHead className="text-center">Auto-Compound</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground text-lg">No pools match your filters</p>
        <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <HeaderWithTooltip tooltip="The blockchain network where this pool operates" className="w-[90px]">Chain</HeaderWithTooltip>
            <HeaderWithTooltip tooltip="The DeFi protocol or platform running this pool" className="w-[130px]">Project</HeaderWithTooltip>
            <HeaderWithTooltip tooltip="The token pair or asset in this pool" className="w-[150px]">Symbol</HeaderWithTooltip>
            <SortableHeader field="tvlUsd" className="text-right w-[90px]" tooltip="Total Value Locked - the amount of money deposited in this pool. Higher TVL generally means more stability.">TVL</SortableHeader>
            <SortableHeader field="apy" className="text-right w-[90px]" tooltip="Annual Percentage Yield - your expected yearly return if rates stay constant. Includes base yield plus rewards.">APY</SortableHeader>
            <HeaderWithTooltip tooltip="APY trend over the past 30 days. Green means rising, red means falling." className="text-center w-[90px]">Trend</HeaderWithTooltip>
            <HeaderWithTooltip tooltip="Impermanent Loss Risk - potential loss when token prices change. None for single assets, Low for stablecoins, Higher for volatile pairs." className="w-[95px]">IL Risk</HeaderWithTooltip>
            <HeaderWithTooltip tooltip="Auto-compound pools automatically reinvest your rewards. Beefy vaults do this multiple times per day." className="text-center w-[105px]">Auto-Compound</HeaderWithTooltip>
            <TableHead className="text-right w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.map((pool) => (
              <TableRow
                key={pool.pool}
                className="hover-elevate group"
                data-testid={`row-pool-${pool.pool.slice(0, 8)}`}
              >
              <TableCell>
                <Badge
                  variant="outline"
                  className={`${getChainColor(pool.chain)} border-0`}
                >
                  {pool.chain}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWatch(pool.pool)}
                    title={isWatched(pool.pool) ? "Remove from watchlist" : "Add to watchlist"}
                    className="shrink-0 rounded-md border border-border p-1 -ml-1 hover:border-amber-500 hover:bg-amber-500/10 transition-colors"
                    aria-label={isWatched(pool.pool) ? "Remove from watchlist" : "Add to watchlist"}
                    data-testid={`button-star-${pool.pool.slice(0, 8)}`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 transition-colors ${
                        isWatched(pool.pool)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400"
                      }`}
                    />
                  </button>
                  <span className="truncate max-w-[130px]">{pool.project}</span>
                  {pool.isHot && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Hot pool — high volume or rising APY"
                          className="inline-flex cursor-help border-0 bg-transparent p-0"
                        >
                          <Flame className="h-4 w-4 text-orange-500" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hot pool - High volume or rising APY</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {pool.apyDeclining && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="APY dropped more than 20% in the last 7 days"
                          className="inline-flex cursor-help border-0 bg-transparent p-0"
                        >
                          <ArrowDown className="h-4 w-4 text-destructive" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>APY dropped more than 20% in last 7 days</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {pool.lowLiquidityRewards && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Reward tokens may have low liquidity"
                          className="inline-flex cursor-help border-0 bg-transparent p-0"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reward tokens may have low liquidity</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm truncate max-w-[160px] inline-block align-middle">{pool.symbol}</span>
                {pool.stablecoin && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Stable
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(pool.tvlUsd)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="font-mono font-semibold text-chart-2">
                    {formatApy(pool.apy)}
                  </span>
                  {(pool.apyBase !== null || pool.apyReward !== null) && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatApy(pool.apyBase ?? 0)} + {formatApy(pool.apyReward ?? 0)} rew
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Sparkline
                  apyPct1D={pool.apyPct1D}
                  apyPct7D={pool.apyPct7D}
                  apyPct30D={pool.apyPct30D}
                  currentApy={pool.apy}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={getIlBadgeVariant(pool.ilRisk)}>
                    {pool.ilRisk === "none" ? "None" : pool.ilRisk.charAt(0).toUpperCase() + pool.ilRisk.slice(1)}
                  </Badge>
                  {pool.ilPctActual !== null && pool.ilPctActual !== undefined && (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-xs text-muted-foreground">
                          ({pool.ilPctActual.toFixed(2)}%)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Actual IL measured over 7 days</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {pool.isBeefy ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                        <Check className="h-3 w-3 mr-1" />
                        Beefy
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Beefy vault - Auto-compounds multiple times daily</p>
                    </TooltipContent>
                  </Tooltip>
                ) : pool.autoCompound ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                        <Check className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto via {pool.autoCompoundProject}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : pool.beefyAvailable ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Beefy
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Beefy vault may be available for this pool</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-muted-foreground">
                        <X className="h-3 w-3 mr-1" />
                        Manual
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manual claim & reinvest needed</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <SharePoolButton pool={pool} />
                  {pool.url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          className="bg-chart-2 hover:bg-chart-2/90"
                          data-testid={`button-invest-${pool.pool.slice(0, 8)}`}
                        >
                          <a
                            href={pool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-0.5 px-1.5"
                            aria-label={`Invest in ${pool.symbol}`}
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open the actual pool to invest</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        data-testid={`button-view-${pool.pool.slice(0, 8)}`}
                      >
                        <a
                          href={`https://defillama.com/yields/pool/${pool.pool}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-0.5 px-1.5"
                          aria-label={`View ${pool.symbol} on DeFiLlama`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View on DeFiLlama</p>
                    </TooltipContent>
                  </Tooltip>
                  {pool.isBeefy ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                          data-testid={`button-zap-beefy-${pool.pool.slice(0, 8)}`}
                        >
                          <a
                            href={getBeefyUrl(pool)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-0.5 px-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Zap via Beefy - Auto-compounds daily</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : pool.autoCompound ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          className="bg-chart-2 hover:bg-chart-2/90"
                          data-testid={`button-zap-auto-${pool.pool.slice(0, 8)}`}
                        >
                          <a
                            href={getAutoCompoundUrl(pool)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-0.5 px-1.5"
                            aria-label={`Zap into ${pool.symbol} (auto-compound)`}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Zap In (Auto-Compound via {pool.autoCompoundProject})</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : pool.beefyAvailable ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                          data-testid={`button-check-beefy-${pool.pool.slice(0, 8)}`}
                        >
                          <a
                            href={getBeefyUrl(pool)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-0.5 px-1.5"
                            aria-label={`Check Beefy vault for ${pool.symbol}`}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Check Beefy vault for auto-compounding</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" asChild data-testid={`button-add-${pool.pool.slice(0, 8)}`}>
                        <a
                          href={getProtocolUrl(pool)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-1"
                        >
                          Add
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add liquidity on {pool.project}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
