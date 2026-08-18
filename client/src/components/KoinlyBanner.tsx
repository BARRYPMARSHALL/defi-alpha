import { ExternalLink, X, FileText, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const KOINLY_URL = import.meta.env.VITE_KOINLY_REFERRAL_URL || "https://koinly.io";
const STORAGE_KEY = "koinly-banner-dismissed";

export function KoinlyBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(isDismissed === "true");
  }, []);

  if (dismissed === null) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <div 
      className="relative overflow-hidden rounded-lg border border-teal-400/30 p-4 sm:p-5 text-white shadow-lg"
      style={{
        background: "linear-gradient(-45deg, #0d9488, #14b8a6, #2dd4bf, #0f766e)",
        backgroundSize: "400% 400%",
        animation: "gradient-shift-koinly 8s ease infinite"
      }}
      data-testid="banner-koinly"
    >
      <style>{`
        @keyframes gradient-shift-koinly {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer-koinly {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-overlay-koinly {
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
          animation: shimmer-koinly 4s infinite;
        }
      `}</style>
      
      <div className="shimmer-overlay-koinly pointer-events-none" />
      
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors z-10"
        aria-label="Dismiss banner"
        data-testid="button-dismiss-koinly"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm shrink-0">
            <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-teal-100 text-xs font-medium border border-white/20">
                <FileText className="h-3 w-3" />
                Tax Partner
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold leading-tight">
              Report DeFi Gains Easily – Save on Taxes This Year
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
              Auto-import from 400+ exchanges & wallets. Generate tax reports in minutes.
            </p>
          </div>
        </div>

        <Button
          asChild
          size="default"
          className="w-full sm:w-auto bg-white text-teal-700 hover:bg-teal-50 hover:scale-105 font-semibold shadow-lg shrink-0 no-default-hover-elevate transition-transform duration-200"
          data-testid="button-try-koinly"
        >
          <a
            href={KOINLY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Try Koinly Free
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
