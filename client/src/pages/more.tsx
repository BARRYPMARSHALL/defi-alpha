import { Link } from "wouter";
import { Briefcase, Coins, BarChart3, GraduationCap, BookOpen, Wallet, ChevronRight, Crown } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/hooks/use-auth";

const ITEMS = [
  {
    href: "/portfolio",
    icon: Briefcase,
    title: "Portfolio builder",
    desc: "Build a diversified yield portfolio by risk profile",
  },
  {
    href: "/stablecoins",
    icon: Coins,
    title: "Stablecoin yields",
    desc: "Stablecoin supply and opportunities by chain",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Market analytics",
    desc: "Charts and trends across all pools",
  },
  {
    href: "/learn",
    icon: GraduationCap,
    title: "Learn DeFi",
    desc: "Course modules and guides for every level",
  },
];

export default function MorePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4">More</h1>

        {/* Account card */}
        <Card className="mb-4">
          <CardContent className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Account</p>
              <p className="font-semibold truncate">
                {user ? user.username : "Not signed in"}
                {user && (
                  <span className={`ml-2 text-xs font-medium ${user.plan === "pro" ? "text-amber-500" : "text-muted-foreground"}`}>
                    {user.plan === "pro" ? "★ Pro" : "Free"}
                  </span>
                )}
              </p>
            </div>
            <AuthButton />
          </CardContent>
        </Card>

        {/* Pro upsell — only for free users */}
        {user && user.plan !== "pro" && (
          <Link href="/checkout">
            <Card className="mb-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 hover-elevate cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                  <Crown className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Upgrade to Pro</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Unlimited Alpha Brain, real-time data, alerts — $12/mo or $99/yr
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Tools */}
        <div className="space-y-2">
          {ITEMS.map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href}>
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3 inline mr-1" />
          <Wallet className="h-3 w-3 inline mr-1" />
          DeFi Alpha — find the safest high yields
        </p>
      </main>
    </div>
  );
}
