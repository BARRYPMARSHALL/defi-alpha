import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, RefreshCw, X } from "lucide-react";
import { Header } from "@/components/Header";
import { FiltersBar } from "@/components/FiltersBar";
import { PoolsTable } from "@/components/PoolsTable";
import { PoolsMobileCards } from "@/components/PoolsMobileCards";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
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

export default function Yields() {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<FilterState>(() =>
    loadFromStorage("yieldsFilters", DEFAULT_FILTERS),
  );
  const [sort, setSort] = useState<SortState>(() =>
    loadFromStorage("yieldsSort", DEFAULT_SORT),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.searchQuery);

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

  const handleFiltersChange = useCallback((next: FilterState) => {
    setFilters(next);
    saveToStorage("yieldsFilters", next);
  }, []);

  const handleSortChange = useCallback((next: SortState) => {
    setSort(next);
    saveToStorage("yieldsSort", next);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
    setSearchDraft("");
    saveToStorage("yieldsFilters", DEFAULT_FILTERS);
    saveToStorage("yieldsSort", DEFAULT_SORT);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/pools"], exact: false });
    refetch();
  }, [refetch]);

  const activeFilterCount =
    (filters.chains.length > 0 ? 1 : 0) +
    (filters.projectTypes.length > 0 ? 1 : 0) +
    (filters.minTvl > 0 ? 1 : 0) +
    (filters.minApy > 0 ? 1 : 0) +
    (filters.lowIlOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header onRefresh={handleRefresh} isRefreshing={isFetching} lastUpdated={data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : null} />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Yield Explorer</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading pools…" : `${data?.stats.totalPools.toLocaleString() || 0} pools · ${data?.chains.length || 0} chains`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            {/* Mobile: filter sheet trigger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="sm:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
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
                  <SheetTitle>Filters</SheetTitle>
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
                  resultCount={pools.length}
                />
                <Button className="mt-4 w-full" onClick={() => setSheetOpen(false)}>
                  Show {pools.length} pools
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search — mobile friendly, always visible */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value);
              // debounce-less: update filters immediately for snappy search
              handleFiltersChange({ ...filters, searchQuery: e.target.value });
            }}
            placeholder="Search project, token, or chain…"
            className="pl-9 pr-9 h-11"
          />
          {searchDraft && (
            <button
              onClick={() => {
                setSearchDraft("");
                handleFiltersChange({ ...filters, searchQuery: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop filter bar */}
        {!isMobile && (
          <FiltersBar
            filters={filters}
            sort={sort}
            availableChains={chains}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
            onReset={handleReset}
            resultCount={pools.length}
          />
        )}

        {/* Results */}
        {isLoading && pools.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground text-lg">No pools match your filters</p>
            <Button variant="outline" className="mt-4" onClick={handleReset}>
              Reset filters
            </Button>
          </div>
        ) : isMobile ? (
          <PoolsMobileCards pools={pools} isLoading={false} />
        ) : (
          <div className="rounded-lg border bg-card">
            <PoolsTable pools={pools} sort={sort} onSortChange={handleSortChange} isLoading={false} />
          </div>
        )}

        {/* Mobile refresh */}
        {isMobile && (
          <Button variant="ghost" className="mt-6 w-full" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing…" : "Refresh data"}
          </Button>
        )}
      </main>
    </div>
  );
}
