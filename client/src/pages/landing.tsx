import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Zap,
  Brain,
  Bell,
  Search,
  Coins,
  Sparkles,
  ArrowRight,
  Layers,
  Smartphone,
  ChartLine,
  GraduationCap,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmailCapture } from "@/components/EmailCapture";
import type { PoolsResponse } from "@shared/schema";

const FEATURES = [
  {
    icon: Shield,
    title: "Risk-adjusted scoring, not yield porn",
    desc: "Every pool ranked by APY × TVL × IL risk. We flag declining APYs, low-liquidity rewards, and anomalous rates other dashboards hide.",
  },
  {
    icon: Search,
    title: "Search every pool, make your own call",
    desc: "15,000+ pools across 100+ chains. Filter by chain, stability, auto-compound, or just type what you're looking for.",
  },
  {
    icon: Brain,
    title: "Alpha Brain — AI that answers from live data",
    desc: "Ask 'best stablecoin yields?' or 'safe pools on Arbitrum?' and get real picks computed from live feeds — not generic advice.",
  },
  {
    icon: Bell,
    title: "APY-change alerts on your watchlist",
    desc: "Star a pool and we watch it. When APY moves significantly, you know before the crowd.",
  },
  {
    icon: Coins,
    title: "Base + reward split, always shown",
    desc: "See exactly how much APY is real yield vs temporary emission rewards. No surprises when incentives end.",
  },
  {
    icon: Zap,
    title: "One tap from pool to protocol",
    desc: "Direct links to the actual pool on DeFiLlama and the protocol — find it fast, invest fast.",
  },
  {
    icon: Scale,
    title: "Portfolio Simulator",
    desc: "Build a what-if yield portfolio from live pools and see the net APY after gas and IL risk — before you commit a cent.",
  },
];

const STEPS = [
  { n: "1", title: "Search", desc: "Type a token, project, or chain — or browse the full list." },
  { n: "2", title: "Compare", desc: "Risk-adjusted score, base vs reward APY, IL risk, gas cost." },
  { n: "3", title: "Decide", desc: "Open the real pool in one tap. Star it to get APY alerts." },
  { n: "4", title: "Go deeper", desc: "Ask Alpha Brain for guidance, or build a portfolio by risk profile." },
];

export default function LandingPage() {
  const { data } = useQuery<PoolsResponse>({
    queryKey: ["/api/pools", "landing"],
    queryFn: async () => {
      const res = await fetch("/api/pools?sortField=riskAdjustedScore&sortDirection=desc", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pools");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalPools = data?.stats.totalPools ?? 15000;
  const chains = data?.chains.length ?? 100;
  const topPicks = (data?.pools || []).filter((p) => p.riskAdjustedScore > 0).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — clean, links to the tool */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-lg">
              <ChartLine className="h-5 w-5 text-primary" />
              DeFi Alpha
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/learn">Learn</Link>
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link href="/">
                Open the tool <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
        <Badge variant="outline" className="mb-4 gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          Live data · {totalPools.toLocaleString()} pools · {chains} chains
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          Find the safest high yields in DeFi —{" "}
          <span className="text-primary">not the ones that rug you</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mt-4 max-w-2xl mx-auto">
          Most yield dashboards show you the biggest number and hope you don't ask questions.
          DeFi Alpha ranks every pool by <strong className="text-foreground">real risk-adjusted return</strong> —
          and shows you the yield others hide.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Button asChild size="lg" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <Search className="h-4 w-4" /> Search {totalPools.toLocaleString()}+ pools — free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto gap-2">
            <Link href="/learn">
              <GraduationCap className="h-4 w-4" /> Take the free course
            </Link>
          </Button>
        </div>

        {/* Live top picks — real data, instant credibility */}
        {topPicks.length > 0 && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {topPicks.map((pool, i) => (
              <Card key={pool.pool} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px]">{pool.chain}</Badge>
                    <span className="text-[10px] text-muted-foreground">#{i + 1} by score</span>
                  </div>
                  <p className="font-semibold truncate">{pool.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{pool.project}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-emerald-500">{pool.apy.toFixed(1)}%</span>
                    <span className="text-[10px] text-muted-foreground">risk-adjusted</span>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">IL: {pool.ilRisk}</Badge>
                    {pool.autoCompound && (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10">auto-compound</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Problem / solution */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-5">
              <p className="font-semibold text-destructive mb-1">The problem</p>
              <p className="text-sm text-muted-foreground">
                Blended APYs hide how much is temporary rewards. Impermanent loss eats "passive income."
                Half of all LP providers lose money — because nobody shows them the real picture.
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-5">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">The fix</p>
              <p className="text-sm text-muted-foreground">
                We score every pool on APY, TVL safety, and impermanent-loss risk — then show you the
                base yield separate from the rewards. The transparency other dashboards avoid.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Everything you need to yield safely</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="hover-elevate">
              <CardContent className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">From curiosity to conviction in four steps</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {n}
              </div>
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile note */}
      <section className="max-w-6xl mx-auto px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          Built mobile-first — the same tool on your phone or desktop.
        </div>
      </section>

      {/* CTA + email */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Start finding safer yields today</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Free forever. No wallet needed. {totalPools.toLocaleString()} pools, ranked honestly.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto mb-4 gap-2">
              <Link href="/">
                <Layers className="h-4 w-4" /> Open the tool — free
              </Link>
            </Button>
            <div className="mt-2">
              <EmailCapture source="landing" compact />
            </div>
          </CardContent>
        </Card>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-6">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>DeFi Alpha — find the safest high yields</span>
          <div className="flex items-center gap-4">
            <Link href="/learn" className="hover:text-foreground">Course</Link>
            <Link href="/more" className="hover:text-foreground">More</Link>
            <span>Data: DeFiLlama</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
