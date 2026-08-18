import { ExternalLink, X, Sparkles, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

const NEXO_URL = import.meta.env.VITE_NEXO_REFERRAL_URL || "https://nexo.com/ref/upb1iww3fa?src=web-link";

interface NexoBannerProps {
  variant?: "compact" | "featured" | "inline";
  storageKey?: string;
}

export function NexoBanner({ variant = "compact", storageKey = "nexo-banner-dismissed" }: NexoBannerProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey);
    setDismissed(isDismissed === "true");
  }, [storageKey]);

  if (dismissed === null || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  if (variant === "featured") {
    return (
      <div 
        className="relative overflow-hidden rounded-lg border border-indigo-400/30 p-4 sm:p-6 text-white shadow-lg"
        style={{
          background: "linear-gradient(-45deg, #667eea, #764ba2, #6B8DD6, #8E37D7)",
          backgroundSize: "400% 400%",
          animation: "gradient-shift-nexo 8s ease infinite"
        }}
        data-testid="banner-nexo-featured"
      >
        <style>{`
          @keyframes gradient-shift-nexo {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pulse-badge-nexo {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes shimmer-nexo {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .shimmer-overlay-nexo {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,0.1),
              transparent
            );
            animation: shimmer-nexo 3s infinite;
          }
        `}</style>
        
        <div className="shimmer-overlay-nexo pointer-events-none" />
        
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors z-10"
          aria-label="Dismiss"
          data-testid="button-dismiss-nexo-featured"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm shrink-0">
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Badge 
                  className="bg-yellow-400/30 text-yellow-200 border border-yellow-400/30 font-bold"
                  style={{ animation: "pulse-badge-nexo 2s ease-in-out infinite" }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Up to 14% APY
                </Badge>
              </div>
              <h3 className="text-lg sm:text-xl font-bold leading-tight">
                Earn Stable Yields – No Farming Hassle
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                Skip complex DeFi strategies. Get predictable yields with instant withdrawals on Nexo.
              </p>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-blue-50 hover:scale-105 font-bold shadow-lg shrink-0 no-default-hover-elevate transition-transform duration-200"
            data-testid="button-nexo-signup-featured"
          >
            <a
              href={NEXO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Nexo + $5K Bonus
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
        
        <div className="relative mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-blue-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Up to 14% APY
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
            Instant Withdrawals
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: "1s" }} />
            $5K BTC Bonus
          </span>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={NEXO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 p-3 rounded-lg border border-indigo-400/30 hover:border-indigo-400 transition-all hover:shadow-md"
        style={{
          background: "linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)",
        }}
        data-testid="banner-nexo-inline"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shrink-0 group-hover:scale-110 transition-transform">
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Earn Up to 14% APY</p>
            <Badge className="bg-indigo-500 text-white border-0 text-[10px]">CeFi</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Nexo High-Yield Savings</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
      </a>
    );
  }

  return (
    <div 
      className="relative overflow-hidden rounded-lg border border-indigo-400/30 p-3 mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)",
      }}
      data-testid="banner-nexo"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors z-10"
        aria-label="Dismiss"
        data-testid="button-dismiss-nexo"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shrink-0 shadow-md">
          <Wallet className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-500 hover:bg-indigo-500 text-white border-0 text-[10px] px-1.5 py-0 font-bold">
              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
              Up to 14% APY
            </Badge>
          </div>
          <p className="text-xs font-bold leading-tight text-foreground">
            Earn Passive Crypto Income
          </p>
          <p className="text-[10px] text-muted-foreground">
            High-yield savings on Nexo
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-bold shrink-0 h-8 shadow-md no-default-hover-elevate"
          data-testid="button-nexo-signup"
        >
          <a
            href={NEXO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign Up
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>
    </div>
  );
}
