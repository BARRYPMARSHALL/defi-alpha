import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface LedgerImageBannerProps {
  variant: "sidebar" | "inline";
  storageKey?: string;
}

const LEDGER_URL = "https://shop.ledger.com/pages/ledger-nano-s-plus/?r=04d0426a5b16";

export function LedgerImageBanner({ variant, storageKey = "ledger-image-dismissed" }: LedgerImageBannerProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey);
    setDismissed(isDismissed === "true");
  }, [storageKey]);

  if (dismissed === null || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  if (variant === "sidebar") {
    return (
      <div className="relative" data-testid="banner-ledger-image-sidebar">
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
          aria-label="Dismiss"
          data-testid="button-dismiss-ledger-sidebar"
        >
          <X className="h-3 w-3 text-white" />
        </button>
        <a 
          href={LEDGER_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          data-testid="link-ledger-sidebar"
        >
          <img 
            width={300} 
            height={250} 
            src="https://affiliate.ledger.com/image/300/250/Default" 
            alt="Ledger Nano S Plus - Secure your crypto"
            className="rounded-lg w-full"
          />
        </a>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="banner-ledger-image-inline">
      <button
        onClick={handleDismiss}
        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
        aria-label="Dismiss"
        data-testid="button-dismiss-ledger-inline"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      <a 
        href={LEDGER_URL} 
        target="_blank" 
        rel="noopener noreferrer"
        data-testid="link-ledger-inline"
      >
        <picture>
          <source 
            media="(max-width: 640px)" 
            srcSet="https://affiliate.ledger.com/image/300/250/Default"
          />
          <img 
            width={728} 
            height={90} 
            src="https://affiliate.ledger.com/image/728/90/Default" 
            alt="Ledger Nano S Plus - Secure your crypto"
            className="rounded-lg w-full"
          />
        </picture>
      </a>
    </div>
  );
}
