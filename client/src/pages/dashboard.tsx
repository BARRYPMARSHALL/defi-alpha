import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { SummaryCards } from "@/components/SummaryCards";
import { FiltersBar } from "@/components/FiltersBar";
import { PoolsTable } from "@/components/PoolsTable";
import { Recommendations } from "@/components/Recommendations";
import { ChainChart } from "@/components/ChainChart";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, TrendingUp, Shield, Zap, HelpCircle } from "lucide-react";
import { ShareBar, ShareCallToAction } from "@/components/ShareBar";
import { ShareMyFind } from "@/components/ShareMyFind";
import { NexoBanner } from "@/components/NexoBanner";
import { LoadingSplash } from "@/components/LoadingSplash";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { DonationButton, DonationBanner } from "@/components/DonationButton";
import { FloatingDonateButton } from "@/components/FloatingDonateButton";
import { QuickGoalFilters, type GoalPreset } from "@/components/QuickGoalFilters";
import { PoolsMobileCards } from "@/components/PoolsMobileCards";
import { AlphaBrainPanel } from "@/components/AlphaBrainPanel";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { FilterState, SortState, PoolsResponse, PoolWithScore } from "@shared/schema";
import heroBanner from "@assets/x1_1768343977535.png";

const DEFAULT_FILTERS: FilterState = {
  minTvl: 5000000,
  chains: [],
  projectTypes: [],
  minApy: 0,
  lowIlOnly: false,
  searchQuery: "",
};

const DEFAULT_SORT: SortState = {
  field: "riskAdjustedScore",
  direction: "desc",
};

function loadFiltersFromStorage(): FilterState {
  try {
    const saved = localStorage.getItem("yieldScoutFilters");
    if (saved) {
      return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load filters from storage");
  }
  return DEFAULT_FILTERS;
}

function loadSortFromStorage(): SortState {
  try {
    const saved = localStorage.getItem("yieldScoutSort");
    if (saved) {
      return { ...DEFAULT_SORT, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load sort from storage");
  }
  return DEFAULT_SORT;
}

function saveFiltersToStorage(filters: FilterState) {
  try {
    localStorage.setItem("yieldScoutFilters", JSON.stringify(filters));
  } catch (e) {
    console.error("Failed to save filters to storage");
  }
}

function saveSortToStorage(sort: SortState) {
  try {
    localStorage.setItem("yieldScoutSort", JSON.stringify(sort));
  } catch (e) {
    console.error("Failed to save sort to storage");
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(loadFiltersFromStorage);
  const [sort, setSort] = useState<SortState>(loadSortFromStorage);
  const [activeGoal, setActiveGoal] = useState<GoalPreset>("all");
  const { watchlist, count: watchlistCount } = useWatchlist();

  const buildQueryUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("minTvl", filters.minTvl.toString());
    params.set("minApy", filters.minApy.toString());
    params.set("lowIlOnly", filters.lowIlOnly.toString());
    params.set("searchQuery", filters.searchQuery);
    params.set("sortField", sort.field);
    params.set("sortDirection", sort.direction);
    
    filters.chains.forEach((chain) => params.append("chains", chain));
    filters.projectTypes.forEach((type) => params.append("projectTypes", type));
    
    return `/api/pools?${params.toString()}`;
  }, [filters, sort]);

  const { data, isLoading, isFetching, refetch } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", filters, sort],
    queryFn: async () => {
      const url = buildQueryUrl();
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch pools: ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    saveFiltersToStorage(newFilters);
    
    // On mobile, scroll to Top 10 Alpha section after filter change
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const el = document.getElementById('top-alpha-mobile');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const handleSortChange = useCallback((newSort: SortState) => {
    setSort(newSort);
    saveSortToStorage(newSort);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
    saveFiltersToStorage(DEFAULT_FILTERS);
    saveSortToStorage(DEFAULT_SORT);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/pools"], exact: false });
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRefresh]);

  const allPools = data?.pools || [];

  const pools: PoolWithScore[] = (() => {
    let list = allPools;
    if (activeGoal === "watchlist") {
      list = list.filter((p) => watchlist.includes(p.pool));
    } else if (activeGoal === "auto-compound") {
      list = list.filter((p) => p.autoCompound || p.isBeefy);
    }
    return list;
  })();

  const stats = data?.stats || { totalPools: 0, avgApy: 0, topChain: "-", topChainTvl: 0 };
  const chains = data?.chains || [];
  const chainDistribution = data?.chainDistribution || [];
  const lastUpdated = data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : null;

  const showSplash = isLoading && pools.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <LoadingSplash isLoading={showSplash} />
      
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        lastUpdated={lastUpdated}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="relative overflow-hidden rounded-xl mb-6" data-testid="hero-banner">
          <img 
            src={heroBanner} 
            alt="DeFi Alpha Agent - Real-time risk-adjusted DeFi Alpha across 100+ chains" 
            className="w-full h-auto object-cover rounded-xl"
          />
        </div>

        <div className="space-y-4 pb-2">
          <div className="text-center">
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-description">
              Find the best DeFi yield opportunities across 100+ chains. We analyze thousands of liquidity pools and lending protocols in real-time, scoring them by risk-adjusted returns so you can maximize your earnings while managing risk.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="scout-features">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-chart-1/20 bg-chart-1/5 px-4 py-4 text-center" data-testid="scout-realtime">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chart-1/15">
                <Search className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Real-time Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Live pool data from DeFiLlama, refreshed every 5 min</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-chart-2/20 bg-chart-2/5 px-4 py-4 text-center" data-testid="scout-riskscoring">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chart-2/15">
                <Shield className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Risk Scoring</p>
                <p className="text-xs text-muted-foreground mt-0.5">APY weighted by TVL &amp; impermanent loss risk</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-chart-3/20 bg-chart-3/5 px-4 py-4 text-center" data-testid="scout-recommendations">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chart-3/15">
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Smart Recommendations</p>
                <p className="text-xs text-muted-foreground mt-0.5">Top picks ranked by risk-adjusted score</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-center" data-testid="scout-autocompound">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Auto-Compound Detection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Flags pools that reinvest rewards automatically</p>
              </div>
            </div>
          </div>
        </div>

        <SummaryCards
          totalPools={stats.totalPools}
          avgApy={stats.avgApy}
          topChain={stats.topChain}
          topChainTvl={stats.topChainTvl}
          isLoading={isLoading}
        />

        <NexoBanner variant="featured" storageKey="nexo-featured-dismissed" />

        <div id="top-alpha-mobile" className="lg:hidden space-y-6">
          <Recommendations
            pools={pools.filter(p => p.riskAdjustedScore > 0).slice(0, 10)}
            isLoading={isLoading}
          />
        </div>

        <EarningsCalculator 
          topPoolApy={pools.length > 0 ? Math.min(Math.max(...pools.slice(0, 50).map(p => p.apy || 0)), 100) : 15}
          avgApy={stats.avgApy > 0 ? Math.min(stats.avgApy, 50) : 8}
        />

        <AlphaBrainPanel />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuickGoalFilters
              active={activeGoal}
              watchlistCount={watchlistCount}
              onChange={(preset, newFilters, newSort) => {
                setActiveGoal(preset);
                if (preset === "watchlist" || preset === "auto-compound" || preset === "all") {
                  // Don't override server filters for these client-side views (except all resets)
                  if (preset === "all") {
                    handleFiltersChange(newFilters);
                    handleSortChange(newSort);
                  }
                } else {
                  handleFiltersChange(newFilters);
                  handleSortChange(newSort);
                }
              }}
            />

            <FiltersBar
              filters={filters}
              sort={sort}
              availableChains={chains}
              onFiltersChange={handleFiltersChange}
              onSortChange={handleSortChange}
              onReset={() => {
                setActiveGoal("all");
                handleReset();
              }}
              resultCount={pools.length}
            />

            {(activeGoal === "watchlist" || activeGoal === "auto-compound") && (
              <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md px-3 py-2 flex items-center justify-between gap-2 flex-wrap" data-testid="goal-active-banner">
                <span>
                  Showing <span className="font-semibold text-foreground">{activeGoal === "watchlist" ? "your watchlist" : "auto-compound pools"}</span>
                  {" "}filtered by your current selection.
                </span>
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => setActiveGoal("all")}
                  data-testid="button-exit-goal"
                >
                  Exit
                </button>
              </div>
            )}

            {activeGoal === "watchlist" && pools.length === 0 && !isLoading && (
              <div className="rounded-md border p-12 text-center bg-muted/20">
                <p className="text-muted-foreground text-lg">Your watchlist is empty</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the star icon next to any pool to save it here
                </p>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block">
              <PoolsTable
                pools={pools}
                sort={sort}
                onSortChange={handleSortChange}
                isLoading={isLoading}
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              <PoolsMobileCards pools={pools} isLoading={isLoading} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block">
              <Recommendations
                pools={pools.filter(p => p.riskAdjustedScore > 0).slice(0, 10)}
                isLoading={isLoading}
              />
            </div>

            <ChainChart
              data={chainDistribution}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      <section className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <DonationBanner />
        
        <Card className="bg-gradient-to-br from-chart-1/5 via-chart-2/5 to-chart-3/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Share DeFi Alpha Agent</h3>
                  <p className="text-sm text-muted-foreground">Help your friends discover the best DeFi yields</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <ShareMyFind pools={pools.filter(p => p.riskAdjustedScore > 0)} />
                <ShareBar />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="faq" className="max-w-7xl mx-auto px-4 py-8 scroll-mt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-apy">
                <AccordionTrigger data-testid="faq-trigger-apy">What is APY and how is it calculated?</AccordionTrigger>
                <AccordionContent>
                  APY (Annual Percentage Yield) represents your expected yearly return, including compound interest. It combines base yields from trading fees or lending interest with additional reward token emissions. The rates shown are real-time from DeFiLlama and can fluctuate based on market conditions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="risk-score">
                <AccordionTrigger data-testid="faq-trigger-risk">How does the risk-adjusted score work?</AccordionTrigger>
                <AccordionContent>
                  Our risk-adjusted score balances APY with safety factors. We consider TVL (higher is safer), impermanent loss risk (based on asset volatility), and APY sustainability. Pools with declining yields or low-liquidity reward tokens are flagged. Beefy auto-compounding vaults receive a ranking boost for their passive, gas-efficient strategy.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="impermanent-loss">
                <AccordionTrigger data-testid="faq-trigger-il">What is impermanent loss?</AccordionTrigger>
                <AccordionContent>
                  Impermanent loss occurs when you provide liquidity to a pool and the relative prices of your deposited assets change. The greater the price divergence, the more IL you experience. Stablecoin pairs have minimal IL risk, while volatile pairs like ETH/altcoins carry higher risk. We classify pools as None, Low, Medium, or High IL risk to help you make informed decisions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="auto-compound">
                <AccordionTrigger data-testid="faq-trigger-autocompound">What are auto-compounding vaults?</AccordionTrigger>
                <AccordionContent>
                  Auto-compounding vaults (like Beefy, Yearn, and Convex) automatically harvest your reward tokens and reinvest them into the pool. This saves you gas fees and time while maximizing your compound returns. Beefy vaults compound multiple times per day across 15+ chains, making them ideal for passive yield farming.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tvl-importance">
                <AccordionTrigger data-testid="faq-trigger-tvl">Why does TVL matter?</AccordionTrigger>
                <AccordionContent>
                  TVL (Total Value Locked) indicates how much capital is deposited in a pool. Higher TVL generally means more liquidity, lower slippage, and greater trust from the community. We filter for pools with at least $5M TVL by default to help you avoid illiquid or risky opportunities.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="data-source">
                <AccordionTrigger data-testid="faq-trigger-data">Where does this data come from?</AccordionTrigger>
                <AccordionContent>
                  All yield data is sourced from DeFiLlama, the largest DeFi analytics platform. They aggregate data from hundreds of protocols across 100+ blockchains. Our dashboard refreshes every 5 minutes to ensure you're seeing the latest opportunities.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Found this helpful? Share with others who want to optimize their DeFi yields:</p>
              <ShareCallToAction />
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">Want to level up your DeFi knowledge?</p>
              <NexoBanner variant="featured" storageKey="nexo-inline-dismissed" />
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 text-center sm:text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shrink-0">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Support This Free Tool</p>
                  <p className="text-xs text-muted-foreground">If DeFi Alpha Agent saved you time or helped you find profitable yields, consider buying me a coffee!</p>
                </div>
                <DonationButton variant="default" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t mt-4">
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
                data-testid="link-follow-twitter"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @DefiAlphaAgent
              </a>
              <span>for daily alerts</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <div className="flex items-center gap-2">
              <span>Business Inquiries & Advertising:</span>
              <a
                href="https://x.com/defialphaagent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-contact-twitter"
              >
                DM @DefiAlphaAgent
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <DonationButton variant="inline" />
          </div>
          <p className="text-xs text-muted-foreground/70 text-center" data-testid="text-affiliate-disclaimer">
            Affiliate links – we may earn commission at no extra cost to you.
          </p>
        </div>
      </footer>

      <FloatingDonateButton />
    </div>
  );
}
