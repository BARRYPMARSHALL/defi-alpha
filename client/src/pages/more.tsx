import { Link } from "wouter";
import { Briefcase, Coins, BarChart3, GraduationCap, BookOpen, Wallet, ChevronRight, ExternalLink, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/hooks/use-auth";
import { useWallet, debankProfileUrl, zerionProfileUrl } from "@/hooks/use-wallet";

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

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function MorePage() {
  const { user } = useAuth();
  const { address, connected, available, connecting, connect, disconnect } = useWallet();

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

        {/* Wallet card */}
        {available && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Wallet
                </p>
                {!connected && (
                  <Button variant="outline" size="sm" onClick={connect} disabled={connecting}>
                    {connecting ? "Connecting…" : "Connect MetaMask"}
                  </Button>
                )}
                {connected && (
                  <Button variant="ghost" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                )}
              </div>

              {connected && address ? (
                <>
                  <p className="font-mono text-sm mb-3 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {address}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <a href={debankProfileUrl(address)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View on DeBank
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <a href={zerionProfileUrl(address)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View on Zerion
                      </a>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {shortAddress(address)} — full position tracking lands here soon (DeBank API).
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Connect to see your positions on DeBank or Zerion. No wallet needed to browse pools.
                </p>
              )}
            </CardContent>
          </Card>
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
