import { ExternalLink, X, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const NEXO_URL = import.meta.env.VITE_NEXO_REFERRAL_URL || "https://nexo.com";
const STORAGE_KEY = "nexo-contextual-cta-dismissed";
const VIEW_COUNT_KEY = "nexo-cta-view-count";

interface NexoContextualCTAProps {
  hasStablePools: boolean;
}

export function NexoContextualCTA({ hasStablePools }: NexoContextualCTAProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(isDismissed === "true");

    if (hasStablePools && isDismissed !== "true") {
      const viewCount = parseInt(localStorage.getItem(VIEW_COUNT_KEY) || "0", 10);
      const newCount = viewCount + 1;
      localStorage.setItem(VIEW_COUNT_KEY, newCount.toString());
      
      if (newCount >= 2) {
        setShouldShow(true);
      }
    }
  }, [hasStablePools]);

  if (dismissed === null || dismissed || !shouldShow || !hasStablePools) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <div 
      className="relative overflow-hidden rounded-lg border border-blue-400/30 p-3 sm:p-4 text-white mb-4"
      style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #6366f1 100%)",
      }}
      data-testid="banner-nexo-contextual"
    >
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.6); }
        }
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors z-10"
        aria-label="Dismiss"
        data-testid="button-dismiss-nexo-contextual"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 shrink-0 pulse-glow">
            <Coins className="h-4 w-4" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold leading-tight">
              Want instant loans against your yield?
            </p>
            <p className="text-xs text-blue-100 mt-0.5">
              Get 8% APY + credit line on Nexo
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-white text-blue-600 hover:bg-blue-50 hover:scale-105 font-semibold shadow-md shrink-0 no-default-hover-elevate transition-transform duration-200"
          data-testid="button-nexo-claim-bonus"
        >
          <a
            href={NEXO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            Claim Bonus
            <ExternalLink className="h-3 w-3 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
