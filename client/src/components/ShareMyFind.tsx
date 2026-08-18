import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Share2, Trophy, TrendingUp, Shield, Copy, Check, Sparkles, Heart } from "lucide-react";
import { SiX, SiTelegram } from "react-icons/si";
import { DonationButton } from "@/components/DonationButton";
import type { PoolWithScore } from "@shared/schema";

interface ShareMyFindProps {
  pools: PoolWithScore[];
}

const SHARE_URL = "https://defialphaagent.com";

function formatApy(apy: number | null | undefined): string {
  if (apy == null) return "high";
  return `${apy.toFixed(2)}%`;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export function ShareMyFind({ pools }: ShareMyFindProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const sortedByScore = [...pools].sort((a, b) => {
    const aBoost = a.isBeefy ? 1.15 : a.autoCompound ? 1.10 : 1;
    const bBoost = b.isBeefy ? 1.15 : b.autoCompound ? 1.10 : 1;
    return (b.riskAdjustedScore * bBoost) - (a.riskAdjustedScore * aBoost);
  });
  
  const topPool = sortedByScore.length > 0 ? sortedByScore[0] : null;

  if (!topPool) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        data-testid="button-share-my-find-disabled"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        No Pools Found
      </Button>
    );
  }

  const shareText = `I found ${formatApy(topPool.apy)} APY on ${topPool.symbol} (${topPool.project}/${topPool.chain}) using DeFi Alpha Agent!`;

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({ title: "Cannot copy", description: "Clipboard not available", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n\nFind your own alpha: ${SHARE_URL}`);
      setCopied(true);
      toast({ title: "Copied!", description: "Share your find with friends" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-gradient-to-r from-chart-1 to-chart-2 hover:from-chart-1/90 hover:to-chart-2/90"
          data-testid="button-share-my-find"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Share My Alpha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Share Your Best Find
          </DialogTitle>
        </DialogHeader>
        
        <div ref={cardRef} className="bg-gradient-to-br from-background to-muted rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Alpha Yield Scout</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Top Discovery</p>
                <p className="font-mono font-medium">{topPool.symbol}</p>
              </div>
              <Badge variant="outline" className="bg-chart-2/10 text-chart-2 text-lg font-bold px-3 py-1">
                {formatApy(topPool.apy)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-background/50 rounded p-2">
                <p className="text-muted-foreground">Chain</p>
                <p className="font-medium">{topPool.chain}</p>
              </div>
              <div className="bg-background/50 rounded p-2">
                <p className="text-muted-foreground">TVL</p>
                <p className="font-medium">{formatNumber(topPool.tvlUsd)}</p>
              </div>
              <div className="bg-background/50 rounded p-2">
                <p className="text-muted-foreground">IL Risk</p>
                <p className="font-medium capitalize">{topPool.ilRisk}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t">
              <Shield className="h-4 w-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Risk-adjusted score: <span className="font-medium text-foreground">{topPool.riskAdjustedScore.toFixed(2)}</span></span>
            </div>
            
            {topPool.isBeefy && (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Beefy Vault - Auto-Compounds
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shareToTwitter}
            data-testid="button-share-find-twitter"
          >
            <SiX className="h-4 w-4 mr-2" />
            Post on X
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareToTelegram}
            data-testid="button-share-find-telegram"
          >
            <SiTelegram className="h-4 w-4 mr-2" />
            Telegram
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid="button-share-find-copy"
          >
            {copied ? <Check className="h-4 w-4 mr-2 text-chart-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground pt-2">
          Share this pool with your friends and help them discover high-yield opportunities!
        </p>

        <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t">
          <Heart className="h-4 w-4 text-pink-500" />
          <span className="text-xs text-muted-foreground">Feeling generous?</span>
          <DonationButton variant="compact" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
