import { Activity, BarChart3, Layers, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SummaryCardsProps {
  totalPools: number;
  avgApy: number;
  topChain: string;
  topChainTvl: number;
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatApy(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

export function SummaryCards({
  totalPools,
  avgApy,
  topChain,
  topChainTvl,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Opportunities",
      value: totalPools.toLocaleString(),
      icon: Layers,
      iconBg: "bg-chart-1/10",
      iconColor: "text-chart-1",
      tooltip: "The number of yield farming pools matching your current filters. Each pool is a place where you can deposit crypto to earn rewards.",
    },
    {
      label: "Average APY",
      value: formatApy(avgApy),
      icon: Activity,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      tooltip: "The average Annual Percentage Yield across all filtered pools. This is a rough benchmark - individual pool returns vary significantly.",
    },
    {
      label: `Top Chain: ${topChain}`,
      value: formatNumber(topChainTvl),
      subLabel: "TVL",
      icon: BarChart3,
      iconBg: "bg-chart-3/10",
      iconColor: "text-chart-3",
      tooltip: "The blockchain with the most Total Value Locked in your filtered pools. Higher TVL often indicates more trusted and liquid pools.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide" data-testid={`label-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {card.label}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[280px]">
                      <p>{card.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-4xl font-bold tracking-tight mt-1 font-mono" data-testid={`value-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {card.value}
                </p>
                {card.subLabel && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subLabel}</p>
                )}
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-md ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
