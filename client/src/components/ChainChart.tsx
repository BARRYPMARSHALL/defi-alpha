import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChainDistribution {
  chain: string;
  tvl: number;
  count: number;
}

interface ChainChartProps {
  data: ChainDistribution[];
  isLoading: boolean;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(217 91% 75%)",
  "hsl(142 76% 50%)",
  "hsl(262 83% 68%)",
  "hsl(38 92% 60%)",
  "hsl(340 82% 62%)",
];

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ChainDistribution;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-popover border rounded-md p-3 shadow-lg">
      <p className="font-medium">{data.chain}</p>
      <p className="text-sm text-muted-foreground">
        TVL: {formatNumber(data.tvl)}
      </p>
      <p className="text-sm text-muted-foreground">
        Pools: {data.count.toLocaleString()}
      </p>
    </div>
  );
}

export function ChainChart({ data, isLoading }: ChainChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chain Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const topChains = data
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 8);

  const otherTvl = data
    .slice(8)
    .reduce((sum, d) => sum + d.tvl, 0);

  const otherCount = data
    .slice(8)
    .reduce((sum, d) => sum + d.count, 0);

  const chartData = [
    ...topChains,
    ...(otherTvl > 0 ? [{ chain: "Other", tvl: otherTvl, count: otherCount }] : []),
  ];

  const totalTvl = chartData.reduce((sum, d) => sum + d.tvl, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chain Distribution by TVL</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="tvl"
              nameKey="chain"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              formatter={(value, entry) => {
                const item = chartData.find((d) => d.chain === value);
                const pct = item ? ((item.tvl / totalTvl) * 100).toFixed(1) : "0";
                return (
                  <span className="text-xs text-foreground">
                    {value} ({pct}%)
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
