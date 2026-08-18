import { Button } from "@/components/ui/button";
import { Sparkles, Shield, Zap, Star, Coins, RefreshCw } from "lucide-react";
import type { FilterState, SortState } from "@shared/schema";

export type GoalPreset =
  | "all"
  | "stable"
  | "high-apy"
  | "safe"
  | "auto-compound"
  | "watchlist";

interface QuickGoalFiltersProps {
  active: GoalPreset;
  onChange: (preset: GoalPreset, filters: FilterState, sort: SortState) => void;
  watchlistCount: number;
}

const PRESETS: Array<{
  key: GoalPreset;
  label: string;
  icon: typeof Sparkles;
  desc: string;
}> = [
  { key: "all", label: "All Pools", icon: Sparkles, desc: "Show everything" },
  { key: "stable", label: "Stable Yield", icon: Coins, desc: "Stablecoin pools, low risk" },
  { key: "high-apy", label: "High APY", icon: Zap, desc: "Highest returns, higher risk" },
  { key: "safe", label: "Safe & Sustainable", icon: Shield, desc: "Big TVL, low IL risk" },
  { key: "auto-compound", label: "Auto-Compound", icon: RefreshCw, desc: "Hands-off pools only" },
  { key: "watchlist", label: "Watchlist", icon: Star, desc: "Your saved pools" },
];

export function getPresetFilters(preset: GoalPreset): { filters: Partial<FilterState>; sort?: SortState } {
  switch (preset) {
    case "stable":
      return {
        filters: { minTvl: 1000000, projectTypes: ["stable", "lending"], minApy: 0, lowIlOnly: true },
        sort: { field: "apy", direction: "desc" },
      };
    case "high-apy":
      return {
        filters: { minTvl: 500000, projectTypes: [], minApy: 20, lowIlOnly: false },
        sort: { field: "apy", direction: "desc" },
      };
    case "safe":
      return {
        filters: { minTvl: 10000000, projectTypes: [], minApy: 0, lowIlOnly: true },
        sort: { field: "riskAdjustedScore", direction: "desc" },
      };
    case "auto-compound":
      return {
        filters: { minTvl: 1000000, projectTypes: [], minApy: 0, lowIlOnly: false },
        sort: { field: "riskAdjustedScore", direction: "desc" },
      };
    case "watchlist":
    case "all":
    default:
      return { filters: {} };
  }
}

export function QuickGoalFilters({ active, onChange, watchlistCount }: QuickGoalFiltersProps) {
  const handleClick = (preset: GoalPreset) => {
    const { filters: presetFilters, sort: presetSort } = getPresetFilters(preset);
    const baseFilters: FilterState = {
      minTvl: 5000000,
      chains: [],
      projectTypes: [],
      minApy: 0,
      lowIlOnly: false,
      searchQuery: "",
    };
    const baseSort: SortState = { field: "riskAdjustedScore", direction: "desc" };
    onChange(
      preset,
      { ...baseFilters, ...presetFilters },
      presetSort || baseSort
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="quick-goal-filters">
      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mr-1">
        I want:
      </span>
      {PRESETS.map((p) => {
        const Icon = p.icon;
        const isActive = active === p.key;
        const isWatchlist = p.key === "watchlist";
        return (
          <Button
            key={p.key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(p.key)}
            className="h-8"
            title={p.desc}
            data-testid={`goal-${p.key}`}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {p.label}
            {isWatchlist && watchlistCount > 0 && (
              <span className="ml-1.5 text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                {watchlistCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
