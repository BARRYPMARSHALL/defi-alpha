import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { SiX, SiTelegram, SiDiscord, SiReddit } from "react-icons/si";
import { Link2, Check, Share2 } from "lucide-react";

interface ShareBarProps {
  className?: string;
  compact?: boolean;
}

const SHARE_TEXT = "I just discovered amazing DeFi yield opportunities on DeFi Alpha Agent - the smartest yield optimizer dashboard!";
const SHARE_URL = "https://defialphaagent.com";

export function ShareBar({ className = "", compact = false }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "Cannot copy",
        description: "Clipboard not available. Please copy the URL manually.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share it with your friends to spread the alpha.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToDiscord = () => {
    const text = `${SHARE_TEXT}\n${SHARE_URL}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied for Discord!",
        description: "Paste this message in your favorite Discord server.",
      });
    } else {
      toast({
        title: "Cannot copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const shareToReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent("DeFi Alpha Agent - Best DeFi Yield Optimizer Dashboard")}`;
    window.open(url, "_blank", "noopener,noreferrer,width=800,height=600");
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shareToTwitter} data-testid="button-share-twitter">
              <SiX className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on X</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shareToTelegram} data-testid="button-share-telegram">
              <SiTelegram className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Telegram</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shareToDiscord} data-testid="button-share-discord-compact">
              <SiDiscord className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy for Discord</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shareToReddit} data-testid="button-share-reddit-compact">
              <SiReddit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Reddit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyLink} data-testid="button-share-copy">
              {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Share2 className="h-4 w-4" />
        Share:
      </span>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={shareToTwitter} data-testid="button-share-twitter-full">
              <SiX className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on X (Twitter)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={shareToTelegram} data-testid="button-share-telegram-full">
              <SiTelegram className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Telegram</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={shareToDiscord} data-testid="button-share-discord-full">
              <SiDiscord className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy for Discord</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={shareToReddit} data-testid="button-share-reddit-full">
              <SiReddit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Reddit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={handleCopyLink} data-testid="button-share-copy-full">
              {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

interface SharePoolButtonProps {
  pool: {
    symbol: string;
    apy: number;
    chain: string;
    project: string;
    pool: string;
  };
}

export function SharePoolButton({ pool }: SharePoolButtonProps) {
  const { toast } = useToast();

  const handleShare = () => {
    const apyText = pool.apy != null ? `${pool.apy.toFixed(1)}%` : "high";
    const text = `Found ${apyText} APY on ${pool.symbol} (${pool.project} / ${pool.chain}) via Alpha Yield Scout!`;
    const url = `${SHARE_URL}?pool=${pool.pool}`;
    const fullText = `${text}\n${url}`;
    
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Alpha Yield Scout - Pool Discovery",
        text: text,
        url: url,
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

export function ShareCallToAction({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-chart-1/10 via-chart-2/10 to-chart-3/10 rounded-lg p-4 border ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Spread the Alpha</p>
            <p className="text-sm text-muted-foreground">Share with friends to help them find great yields too</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareBar compact />
        </div>
      </div>
    </div>
  );
}
