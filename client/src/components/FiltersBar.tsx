import { useState, useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { FilterState, SortState } from "@shared/schema";

interface FiltersBarProps {
  filters: FilterState;
  sort: SortState;
  availableChains: string[];
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortState) => void;
  onReset: () => void;
  resultCount: number;
}

const PROJECT_TYPES = [
  { value: "lp" as const, label: "LP" },
  { value: "lending" as const, label: "Lending" },
  { value: "stable" as const, label: "Stable" },
  { value: "volatile" as const, label: "Volatile" },
];

const SORT_OPTIONS = [
  { value: "riskAdjustedScore", label: "Risk-Adjusted Score" },
  { value: "tvlUsd", label: "TVL" },
  { value: "apy", label: "APY" },
  { value: "apyPct7D", label: "7d Change" },
] as const;

const MIN_TVL_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 100000, label: "$100K+" },
  { value: 500000, label: "$500K+" },
  { value: 1000000, label: "$1M+" },
  { value: 5000000, label: "$5M+" },
  { value: 10000000, label: "$10M+" },
  { value: 50000000, label: "$50M+" },
];

export function FiltersBar({
  filters,
  sort,
  availableChains,
  onFiltersChange,
  onSortChange,
  onReset,
  resultCount,
}: FiltersBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSearch(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, searchQuery: value });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const activeFilterCount = [
    filters.minTvl > 0,
    filters.chains.length > 0,
    filters.projectTypes.length > 0,
    filters.minApy > 0,
    filters.lowIlOnly,
    filters.searchQuery.length > 0,
  ].filter(Boolean).length;

  const handleChainToggle = (chain: string) => {
    const newChains = filters.chains.includes(chain)
      ? filters.chains.filter((c) => c !== chain)
      : [...filters.chains, chain];
    onFiltersChange({ ...filters, chains: newChains });
  };

  const handleTypeToggle = (type: typeof filters.projectTypes[number]) => {
    const newTypes = filters.projectTypes.includes(type)
      ? filters.projectTypes.filter((t) => t !== type)
      : [...filters.projectTypes, type];
    onFiltersChange({ ...filters, projectTypes: newTypes });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pools, projects..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        <Select
          value={filters.minTvl.toString()}
          onValueChange={(val) =>
            onFiltersChange({ ...filters, minTvl: parseInt(val) })
          }
        >
          <SelectTrigger className="w-[140px]" data-testid="select-min-tvl-trigger">
            <SelectValue placeholder="Min TVL" />
          </SelectTrigger>
          <SelectContent>
            {MIN_TVL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()} data-testid={`select-item-tvl-${opt.value}`}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-chains-filter">
              Chains
              {filters.chains.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.chains.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableChains.slice(0, 20).map((chain) => (
                <div key={chain} className="flex items-center gap-2">
                  <Checkbox
                    id={`chain-${chain}`}
                    checked={filters.chains.includes(chain)}
                    onCheckedChange={() => handleChainToggle(chain)}
                    data-testid={`checkbox-chain-${chain.toLowerCase()}`}
                  />
                  <Label
                    htmlFor={`chain-${chain}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {chain}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-type-filter">
              Type
              {filters.projectTypes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.projectTypes.length}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-4" align="start">
            <div className="space-y-2">
              {PROJECT_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.projectTypes.includes(type.value)}
                    onCheckedChange={() => handleTypeToggle(type.value)}
                    data-testid={`checkbox-type-${type.value}`}
                  />
                  <Label
                    htmlFor={`type-${type.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <Switch
            id="low-il"
            checked={filters.lowIlOnly}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, lowIlOnly: checked })
            }
            data-testid="switch-low-il-only"
          />
          <Label htmlFor="low-il" className="text-sm cursor-pointer" data-testid="label-low-il-only">
            Low IL Only
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select
            value={sort.field}
            onValueChange={(val) =>
              onSortChange({ ...sort, field: val as SortState["field"] })
            }
          >
            <SelectTrigger className="w-[180px]" data-testid="select-sort-field">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`select-item-sort-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              onSortChange({
                ...sort,
                direction: sort.direction === "asc" ? "desc" : "asc",
              })
            }
            data-testid="button-toggle-sort-direction"
          >
            {sort.direction === "desc" ? "↓" : "↑"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground" data-testid="text-pool-count">
            {resultCount.toLocaleString()} pools
          </span>
          {activeFilterCount > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              <Badge variant="secondary" data-testid="badge-active-filter-count">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </Badge>
            </>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground"
            data-testid="button-clear-all-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
