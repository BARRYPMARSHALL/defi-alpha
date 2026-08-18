import { useState } from "react";
import { Link } from "wouter";
import { RefreshCw, GraduationCap, BarChart3, Share2, Link2, Check, HelpCircle, Gift, MoreHorizontal, Briefcase, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { ShareBar } from "./ShareBar";
import { DonationButton } from "./DonationButton";
import { AuthButton } from "./AuthButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiX, SiTelegram, SiDiscord, SiReddit } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/33_1775959909661.png";

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string | null;
  /** Optional element rendered in the desktop header action row (e.g. AlertBell). */
  rightSlot?: React.ReactNode;
}

const SHARE_TEXT = "I just discovered amazing DeFi yield opportunities on DeFi Alpha Agent - the smartest yield optimizer dashboard!";
const SHARE_URL = "https://defialphaagent.com";

function MobileShareDropdown() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with your friends." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`, "_blank");
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`, "_blank");
  };

  const shareToDiscord = () => {
    navigator.clipboard.writeText(`${SHARE_TEXT}\n${SHARE_URL}`);
    toast({ title: "Copied for Discord!", description: "Paste in your favorite server." });
  };

  const shareToReddit = () => {
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent("DeFi Alpha Agent - Best DeFi Yield Optimizer")}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-share-dropdown">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={shareToTwitter} className="gap-2 cursor-pointer">
          <SiX className="h-4 w-4" /> Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTelegram} className="gap-2 cursor-pointer">
          <SiTelegram className="h-4 w-4" /> Share on Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToDiscord} className="gap-2 cursor-pointer">
          <SiDiscord className="h-4 w-4" /> Copy for Discord
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToReddit} className="gap-2 cursor-pointer">
          <SiReddit className="h-4 w-4" /> Share on Reddit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMoreDropdown() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with your friends." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`, "_blank");
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" data-testid="button-more-dropdown">
          <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href="/#faq">
            <HelpCircle className="h-4 w-4" /> FAQ
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href="https://defillama.com/airdrops" target="_blank" rel="noopener noreferrer" className="text-purple-400">
            <Gift className="h-4 w-4" /> Airdrops
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="gap-2 cursor-pointer">
          <SiX className="h-4 w-4" /> Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTelegram} className="gap-2 cursor-pointer">
          <SiTelegram className="h-4 w-4" /> Share on Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ onRefresh, isRefreshing = false, lastUpdated, rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* Desktop Layout */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 h-16 items-center justify-between gap-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home">
            <img 
              src={logoImage} 
              alt="DeFi Alpha Agent" 
              className="w-10 h-10 rounded-md object-cover"
              data-testid="img-logo"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight" data-testid="text-app-title">
                DeFi Alpha Agent
              </h1>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground" data-testid="text-last-updated">
                  Updated {lastUpdated}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/portfolio">
            <Button variant="outline" size="sm" data-testid="button-portfolio">
              <Briefcase className="h-4 w-4 mr-2" />
              Portfolio
            </Button>
          </Link>

          <Link href="/stablecoins">
            <Button variant="outline" size="sm" data-testid="button-stablecoins">
              <Coins className="h-4 w-4 mr-2" />
              Stables
            </Button>
          </Link>

          <Link href="/analytics">
            <Button variant="outline" size="sm" data-testid="button-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          
          <Link href="/learn">
            <Button variant="outline" size="sm" data-testid="button-learn-defi">
              <GraduationCap className="h-4 w-4 mr-2" />
              Learn DeFi
            </Button>
          </Link>
          
          <a href="/#faq">
            <Button variant="outline" size="sm" data-testid="button-faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQ
            </Button>
          </a>
          
          <a href="https://defillama.com/airdrops" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10" data-testid="button-airdrops">
              <Gift className="h-4 w-4 mr-2" />
              Airdrops
            </Button>
          </a>
          
          <ShareBar compact />
          
          <AuthButton compact />
          
          <DonationButton variant="compact" />
          
          {rightSlot}
          
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Layout - Single Row (navigation lives in the bottom tab bar) */}
      <div className="sm:hidden max-w-7xl mx-auto px-3">
        <div className="flex items-center justify-between py-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-mobile">
              <img 
                src={logoImage} 
                alt="DeFi Alpha" 
                className="w-8 h-8 rounded-md object-cover"
                data-testid="img-logo-mobile"
              />
              <div className="flex flex-col">
                <h1 className="text-base font-bold tracking-tight" data-testid="text-app-title-mobile">
                  DeFi Alpha
                </h1>
                {lastUpdated && (
                  <span className="text-[10px] text-muted-foreground" data-testid="text-last-updated-mobile">
                    Updated {lastUpdated}
                  </span>
                )}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {rightSlot}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
                disabled={isRefreshing}
                data-testid="button-refresh-mobile"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            <AuthButton compact />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
