import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SparklineProps {
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  currentApy: number;
  showMomentum?: boolean;
}

function generateSparklinePoints(
  apyPct1D: number | null,
  apyPct7D: number | null,
  apyPct30D: number | null,
  currentApy: number
): number[] {
  const points: number[] = [];
  
  const apy30dAgo = apyPct30D !== null ? currentApy / (1 + apyPct30D / 100) : currentApy;
  const apy7dAgo = apyPct7D !== null ? currentApy / (1 + apyPct7D / 100) : currentApy;
  const apy1dAgo = apyPct1D !== null ? currentApy / (1 + apyPct1D / 100) : currentApy;
  
  points.push(apy30dAgo);
  
  const interpolate = (start: number, end: number, steps: number) => {
    const result = [];
    for (let i = 1; i <= steps; i++) {
      result.push(start + (end - start) * (i / steps));
    }
    return result;
  };
  
  points.push(...interpolate(apy30dAgo, apy7dAgo, 3));
  points.push(...interpolate(apy7dAgo, apy1dAgo, 2));
  points.push(currentApy);
  
  return points;
}

function getMomentum(apyPct7D: number | null): "up" | "down" | "neutral" {
  if (apyPct7D === null || apyPct7D === undefined) return "neutral";
  if (apyPct7D > 2) return "up";
  if (apyPct7D < -2) return "down";
  return "neutral";
}

export function Sparkline({
  apyPct1D,
  apyPct7D,
  apyPct30D,
  currentApy,
  showMomentum = true,
}: SparklineProps) {
  const points = useMemo(
    () => generateSparklinePoints(apyPct1D, apyPct7D, apyPct30D, currentApy),
    [apyPct1D, apyPct7D, apyPct30D, currentApy]
  );

  const momentum = getMomentum(apyPct7D);

  const width = 60;
  const height = 24;
  const padding = 2;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const pathPoints = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const strokeColor = momentum === "up" 
    ? "hsl(var(--chart-2))" 
    : momentum === "down" 
    ? "hsl(var(--destructive))" 
    : "hsl(var(--muted-foreground))";

  const tooltipText = [
    apyPct30D !== null ? `30d: ${apyPct30D > 0 ? "+" : ""}${apyPct30D.toFixed(1)}%` : null,
    apyPct7D !== null ? `7d: ${apyPct7D > 0 ? "+" : ""}${apyPct7D.toFixed(1)}%` : null,
    apyPct1D !== null ? `1d: ${apyPct1D > 0 ? "+" : ""}${apyPct1D.toFixed(1)}%` : null,
  ].filter(Boolean).join(" | ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <svg
            width={width}
            height={height}
            className="shrink-0"
            viewBox={`0 0 ${width} ${height}`}
          >
            <path
              d={pathPoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {showMomentum && (
            <div className="shrink-0">
              {momentum === "up" && (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              )}
              {momentum === "down" && (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              {momentum === "neutral" && (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs font-mono">
          {tooltipText || "No trend data available"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MomentumBadge({ apyPct7D }: { apyPct7D: number | null }) {
  const momentum = getMomentum(apyPct7D);
  
  if (momentum === "up") {
    return (
      <div className="flex items-center gap-1 text-xs text-chart-2">
        <TrendingUp className="h-3 w-3" />
        <span>Rising</span>
      </div>
    );
  }
  
  if (momentum === "down") {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <TrendingDown className="h-3 w-3" />
        <span>Falling</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />
      <span>Stable</span>
    </div>
  );
}
