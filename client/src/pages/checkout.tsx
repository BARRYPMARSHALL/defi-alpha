import { useState } from "react";
import { Link } from "wouter";
import { Crown, Shield, Zap, Brain, Loader2, Check, Coins } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: Brain, text: "Unlimited Alpha Brain AI messages" },
  { icon: Zap, text: "Real-time pool data, no delay" },
  { icon: Shield, text: "Unlimited APY-change alerts" },
  { icon: Coins, text: "Pay with crypto or card" },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const price = period === "annual" ? 99 : 12;
  const priceLabel = period === "annual" ? "$99" : "$12";

  async function handleCheckout() {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 503) setConfigured(false);
        throw new Error(data.error || "Checkout failed");
      }
      if (data.alreadyPro) {
        window.location.href = "/more";
        return;
      }
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header />

      <main className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Go Pro</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Unlock the full power of DeFi Alpha.
        </p>

        <Card className="mb-4">
          <CardContent className="pt-6">
            {/* Period toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPeriod("monthly")}
                className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${
                  period === "monthly"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <div className="text-sm font-semibold">Monthly</div>
                <div className="text-lg font-bold">$12</div>
                <div className="text-[10px] text-muted-foreground">per month</div>
              </button>
              <button
                onClick={() => setPeriod("annual")}
                className={`rounded-lg border px-3 py-2.5 text-center transition-colors relative ${
                  period === "annual"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Badge variant="default" className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px]">
                  SAVE 31%
                </Badge>
                <div className="text-sm font-semibold">Annual</div>
                <div className="text-lg font-bold">$99</div>
                <div className="text-[10px] text-muted-foreground">per year</div>
              </button>
            </div>

            <ul className="space-y-2.5 mb-5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {!configured && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                Payments aren't configured yet — check back soon.
              </p>
            )}

            {error && !configured && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}

            <Button onClick={handleCheckout} disabled={loading || !configured} className="w-full h-11" size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-1" />
              )}
              {user ? `Upgrade — ${priceLabel}` : "Sign in to upgrade"}
            </Button>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Pay with crypto (BTC, ETH, USDT…) or card — powered by CoinGate.
              <br />
              Cancel anytime. Instant activation on payment.
            </p>
          </CardContent>
        </Card>

        <Link href="/more">
          <Button variant="ghost" className="w-full text-muted-foreground">
            Maybe later
          </Button>
        </Link>
      </main>
    </div>
  );
}
