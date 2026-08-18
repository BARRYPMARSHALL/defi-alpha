import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";

const SHARE_URL = "https://defialphaagent.com";

interface SharePoolButtonProps {
  pool: {
    symbol: string;
    apy: number;
    chain: string;
    project: string;
    pool: string;
  };
}

/** Per-pool share button: uses the native share sheet when available. */
export function SharePoolButton({ pool }: SharePoolButtonProps) {
  const { toast } = useToast();

  const handleShare = () => {
    const apyText = pool.apy != null ? `${pool.apy.toFixed(1)}%` : "high";
    const text = `Found ${apyText} APY on ${pool.symbol} (${pool.project} / ${pool.chain}) via DeFi Alpha!`;
    const url = `${SHARE_URL}?pool=${pool.pool}`;
    const fullText = `${text}\n${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "DeFi Alpha - Pool Discovery",
        text,
        url,
      }).catch(() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(fullText);
          toast({
            title: "Copied to clipboard!",
            description: "Share this pool with your friends.",
          });
        }
      });
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(twitterUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs gap-1"
      onClick={(e) => {
        e.stopPropagation();
        handleShare();
      }}
      data-testid={`button-share-pool-${pool.pool.slice(0, 8)}`}
    >
      <Share2 className="h-3 w-3" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
