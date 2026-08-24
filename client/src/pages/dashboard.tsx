import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, SlidersHorizontal, ChevronDown, Brain, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { AlphaBrainPanel } from "@/components/AlphaBrainPanel";
import { AlertBell } from "@/components/AlertBell";
import { FiltersBar } from "@/components/FiltersBar";
import { PoolsTable } from "@/components/PoolsTable";
import { PoolsMobileCards } from "@/components/PoolsMobileCards";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { FilterState, SortState, PoolsResponse } from "@shared/schema";

const DEFAULT_FILTERS: FilterState = {
  minTvl: 0,
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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return { ...fallback, ...JSON.parse(saved) } as T;
  } catch {
    // ignore
  }
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

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

/** Quick one-tap filter chips — the most common searches, zero friction. */
const QUICK_FILTERS: { key: string; label: string; apply: (f: FilterState) => FilterState }[] = [
  {
    key: "all",
    label: "All",
    // All = show everything: reset all filters AND clear any active search
    apply: () => ({ ...DEFAULT_FILTERS, searchQuery: "" }),
  },
  {
    key: "stable",
    label: "Stablecoins",
    apply: (f) => ({ ...f, projectTypes: ["stable"], minApy: 0, lowIlOnly: false }),
  },
  {
    key: "highApy",
    label: "High APY (20%+)",
    apply: (f) => ({ ...f, minApy: 20, minTvl: 500000 }),
  },
  {
    key: "safe",
    label: "Safe (low IL)",
    apply: (f) => ({ ...f, lowIlOnly: true, minTvl: 5000000 }),
  },
  {
    key: "auto",
    label: "Auto-compound",
    apply: (f) => ({ ...f, searchQuery: "auto" }),
  },
];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { watchlist } = useWatchlist();

  const [filters, setFilters] = useState<FilterState>(() =>
    loadFromStorage("homeFilters", DEFAULT_FILTERS),
  );
  const [sort, setSort] = useState<SortState>(() =>
    loadFromStorage("homeSort", DEFAULT_SORT),
  );
  const [searchDraft, setSearchDraft] = useState("");
  // Debounce searchQuery so typing doesn't fire a /api/pools request per
  // keystroke (matches the FiltersBar debounce pattern).
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeQuick, setActiveQuick] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [courseNudgeDismissed, setCourseNudgeDismissed] = useState(
    () => {
      try {
        return localStorage.getItem("defiAlphaCourseNudgeDismissed") === "1";
      } catch {
        return false;
      }
    },
  );

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
      const res = await fetch(buildQueryUrl(), { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch pools: ${res.status}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const pools = data?.pools || [];
  const chains = data?.chains || [];
  const stats = data?.stats || { totalPools: 0, avgApy: 0, topChain: "-", topChainTvl: 0 };

  // Client-side watchlist view: filter the already-loaded list
  const visiblePools = useMemo(() => {
    if (activeQuick === "watchlist") {
      return pools.filter((p) => watchlist.includes(p.pool));
    }
    return pools;
  }, [pools, watchlist, activeQuick]);

  const handleFiltersChange = useCallback((next: FilterState) => {
    setFilters(next);
    saveToStorage("homeFilters", next);
  }, []);

  const handleSortChange = useCallback((next: SortState) => {
    setSort(next);
    saveToStorage("homeSort", next);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
    setSearchDraft("");
    setActiveQuick("all");
    saveToStorage("homeFilters", DEFAULT_FILTERS);
    saveToStorage("homeSort", DEFAULT_SORT);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const applyQuickFilter = useCallback(
    (key: string) => {
      setActiveQuick(key);
      if (key === "watchlist") return; // client-side only
      const preset = QUICK_FILTERS.find((q) => q.key === key);
      if (preset) {
        handleFiltersChange(preset.apply(filters));
        setSearchDraft(preset.apply(filters).searchQuery);
      }
    },
    [filters, handleFiltersChange],
  );

  const activeFilterCount =
    (filters.chains.length > 0 ? 1 : 0) +
    (filters.projectTypes.length > 0 ? 1 : 0) +
    (filters.minTvl > 0 ? 1 : 0) +
    (filters.minApy > 0 ? 1 : 0) +
    (filters.lowIlOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        lastUpdated={data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : null}
        rightSlot={<AlertBell />}
      />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* Funnel nudge: new visitors get a subtle invite to the free course */}
        {!courseNudgeDismissed && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
            <p className="flex-1 min-w-0">
              <span className="font-medium">New to DeFi?</span>{" "}
              <Link href="/learn" className="text-primary hover:underline">
                Take the free course
              </Link>{" "}
              <span className="text-muted-foreground">then put it to work here.</span>
            </p>
            <button
              onClick={() => {
                setCourseNudgeDismissed(true);
                localStorage.setItem("defiAlphaCourseNudgeDismissed", "1");
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Search first: the tool's primary job ── */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => {
              const value = e.target.value;
              setSearchDraft(value);
              setActiveQuick("all");
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => {
                handleFiltersChange({ ...filters, searchQuery: value });
              }, 350);
            }}
            placeholder="Search any pool, token, or chain… (e.g. USDC, Aave, Arbitrum)"
            className="pl-11 pr-10 h-12 text-base"
            autoFocus={!isMobile}
          />
          {searchDraft && (
            <button
              onClick={() => {
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearchDraft("");
                handleFiltersChange({ ...filters, searchQuery: "" });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick filter chips — wrap on mobile, no horizontal slider feel */}
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.key}
              onClick={() => applyQuickFilter(qf.key)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors ${
                activeQuick === qf.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {qf.label}
            </button>
          ))}
          <button
            onClick={() => applyQuickFilter("watchlist")}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors ${
              activeQuick === "watchlist"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            ★ Watchlist ({watchlist.length})
          </button>
        </div>

        {/* Results meta + sort + advanced filters */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading pools…"
              : activeQuick === "watchlist"
                ? `${visiblePools.length.toLocaleString()} watched · ${data?.chains.length || 0} chains`
                : data && data.total > visiblePools.length
                  ? `showing ${visiblePools.length.toLocaleString()} of ${data.total.toLocaleString()} pools · ${data.chains.length} chains`
                  : `${visiblePools.length.toLocaleString()} pools · ${data?.chains.length || 0} chains`}
          </p>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={`${sort.field}:${sort.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split(":");
                  handleSortChange({ field: field as SortState["field"], direction: direction as "asc" | "desc" });
                }}
                className="appearance-none h-9 rounded-md border bg-background pl-3 pr-8 text-sm font-medium"
                aria-label="Sort pools"
              >
                <option value="riskAdjustedScore:desc">Best score</option>
                <option value="apy:desc">Highest APY</option>
                <option value="apy:asc">Lowest APY</option>
                <option value="tvlUsd:desc">Highest TVL</option>
                <option value="apyPct7D:desc">7d gain</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
            </div>

            {/* Advanced filters: bottom sheet on mobile, inline bar on desktop.
                The trigger is mobile-only — on desktop the inline FiltersBar
                (below) is the entry point, and a hidden sheet was dead UI. */}
            <div className="sm:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <SlidersHorizontal className="h-4 w-4 mr-1" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto pb-10">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Advanced filters</SheetTitle>
                  </SheetHeader>
                  <FiltersBar
                    filters={filters}
                    sort={sort}
                    availableChains={chains}
                    onFiltersChange={handleFiltersChange}
                    onSortChange={handleSortChange}
                    onReset={() => {
                      handleReset();
                      setSheetOpen(false);
                    }}
                    resultCount={visiblePools.length}
                  />
                  <Button className="mt-4 w-full" onClick={() => setSheetOpen(false)}>
                    Show {visiblePools.length} pools
                  </Button>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Full filter bar on desktop */}
        {!isMobile && activeFilterCount > 0 && (
          <FiltersBar
            filters={filters}
            sort={sort}
            availableChains={chains}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
            onReset={handleReset}
            resultCount={visiblePools.length}
          />
        )}

        {/* ── The full pool list: the core job ── */}
        {isLoading && pools.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : visiblePools.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-lg">
              {activeQuick === "watchlist"
                ? "No watched pools yet — star a pool to track it here"
                : "No pools match your filters"}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleReset}>
              Reset
            </Button>
          </div>
        ) : isMobile ? (
          <PoolsMobileCards pools={visiblePools} isLoading={false} />
        ) : (
          <div className="rounded-lg border bg-card">
            <PoolsTable pools={visiblePools} sort={sort} onSortChange={handleSortChange} isLoading={false} />
          </div>
        )}

        {/* ── Alpha Brain: advisory, below the data (data first) ── */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Alpha Brain — ask about what you see
          </h2>
          <AlphaBrainPanel />
        </section>
      </main>
    </div>
  );
}
