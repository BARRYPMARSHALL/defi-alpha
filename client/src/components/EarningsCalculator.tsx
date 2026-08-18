import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, ChevronDown, ChevronUp, DollarSign, TrendingUp, Sparkles } from "lucide-react";

interface EarningsCalculatorProps {
  topPoolApy?: number;
  avgApy?: number;
}

export function EarningsCalculator({ topPoolApy = 15, avgApy = 8 }: EarningsCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [investment, setInvestment] = useState<string>("1000");
  const [selectedApy, setSelectedApy] = useState<"top" | "avg">("top");

  const investmentNum = parseFloat(investment) || 0;
  const apy = selectedApy === "top" ? topPoolApy : avgApy;

  const daily = (investmentNum * (apy / 100)) / 365;
  const weekly = daily * 7;
  const monthly = daily * 30;
  const yearly = investmentNum * (apy / 100);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${value.toFixed(2)}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem("earnings-calc-expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("earnings-calc-expanded", String(newState));
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-chart-2/5 overflow-hidden">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between p-4 hover-elevate transition-colors"
        data-testid="button-toggle-earnings-calc"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-base">Earnings Calculator</h3>
            <p className="text-sm text-muted-foreground">See what you could earn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && investmentNum > 0 && (
            <Badge variant="secondary" className="hidden sm:flex">
              {formatCurrency(monthly)}/month at {apy.toFixed(1)}% APY
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-5 px-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="investment-amount" className="text-sm font-medium mb-2 block">Investment Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="investment-amount"
                    type="number"
                    placeholder="1000"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    className="pl-9 text-lg font-semibold"
                    min="0"
                    data-testid="input-investment-amount"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">APY Rate</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant={selectedApy === "top" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedApy("top")}
                    className="flex-1 text-xs sm:text-sm"
                    data-testid="button-top-apy"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <span className="truncate">Top Pool ({topPoolApy.toFixed(1)}%)</span>
                  </Button>
                  <Button
                    variant={selectedApy === "avg" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedApy("avg")}
                    className="flex-1 text-xs sm:text-sm"
                    data-testid="button-avg-apy"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <span className="truncate">Average ({avgApy.toFixed(1)}%)</span>
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Estimates based on current APY. Actual returns may vary.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Daily</p>
                <p className="text-lg font-bold text-foreground" data-testid="text-daily-earnings">
                  {formatCurrency(daily)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                <p className="text-lg font-bold text-foreground" data-testid="text-weekly-earnings">
                  {formatCurrency(weekly)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                <p className="text-xl font-bold text-primary" data-testid="text-monthly-earnings">
                  {formatCurrency(monthly)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <p className="text-xs text-muted-foreground mb-1">Yearly</p>
                <p className="text-xl font-bold text-chart-2" data-testid="text-yearly-earnings">
                  {formatCurrency(yearly)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
