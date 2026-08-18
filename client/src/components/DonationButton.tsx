import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Copy, Check, Sparkles, Coffee, Rocket } from "lucide-react";
import { SiBitcoin, SiEthereum, SiSolana, SiRipple } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

const WALLETS = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    address: "bc1q3q3k2fekac03cv24df6a40cfp2q7njwhwxj5qg",
    icon: SiBitcoin,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    address: "0x29A6269af528111B15e5c01Dbf354fe14a5f48Cb",
    icon: SiEthereum,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    name: "Solana",
    symbol: "SOL",
    address: "FGJtxFdGsHaGS1vSZzR83ES23rYMZ8m6GG6rnrr6KCgo",
    icon: SiSolana,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    name: "XRP",
    symbol: "XRP",
    address: "r99PFVRmKi84coxEi3Z2F1w6XMi1LQQeB4",
    icon: SiRipple,
    color: "text-slate-300",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
];

interface DonationButtonProps {
  variant?: "default" | "floating" | "inline" | "compact" | "floating-icon";
  className?: string;
}

export function DonationButton({ variant = "default", className = "" }: DonationButtonProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (address: string, symbol: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast({
        title: "Address copied!",
        description: `${symbol} address copied to clipboard`,
      });
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the address manually",
        variant: "destructive",
      });
    }
  };

  const buttonContent = () => {
    switch (variant) {
      case "floating":
        return (
          <Button
            size="lg"
            className="group bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/25 border-0"
            data-testid="button-donate-floating"
          >
            <Heart className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            <span>Buy Me a Coffee</span>
            <Sparkles className="h-4 w-4 ml-2 opacity-70" />
          </Button>
        );
      case "compact":
        return (
          <Button
            size="icon"
            variant="outline"
            className="group border-pink-500/50 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
            data-testid="button-donate-compact"
          >
            <Heart className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </Button>
        );
      case "floating-icon":
        return (
          <Button
            size="lg"
            className="relative group w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/25 border-0"
            data-testid="button-donate-floating-icon"
          >
            <Heart className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </Button>
        );
      case "inline":
        return (
          <Button
            variant="ghost"
            className="group text-muted-foreground hover:text-pink-400"
            data-testid="button-donate-inline"
          >
            <Coffee className="h-4 w-4 mr-2" />
            <span>Support this project</span>
          </Button>
        );
      default:
        return (
          <Button
            className="group bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
            data-testid="button-donate"
          >
            <Heart className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            <span>Support Us</span>
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild className={className}>
        {buttonContent()}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500">
                <Heart className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-xl">
            <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
              Found Alpha That Paid Off?
            </span>
          </DialogTitle>
          <DialogDescription className="text-base pt-2 space-y-2">
            <p>
              If DeFi Alpha Agent helped you discover profitable yields or saved you from a bad investment, consider buying me a coffee!
            </p>
            <p className="text-sm text-muted-foreground/80 flex items-center justify-center gap-2">
              <Rocket className="h-4 w-4 text-pink-400" />
              Your support keeps this free tool running and improving
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {WALLETS.map((wallet) => (
            <Card
              key={wallet.symbol}
              className={`${wallet.bgColor} ${wallet.borderColor} border overflow-hidden transition-all hover:scale-[1.02]`}
            >
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${wallet.bgColor} shrink-0`}>
                      <wallet.icon className={`h-5 w-5 ${wallet.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{wallet.name}</span>
                      <span className={`text-xs ${wallet.color} font-medium`}>{wallet.symbol}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-mono truncate flex-1">
                      {wallet.address}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(wallet.address, wallet.symbol)}
                      className={`shrink-0 ${copiedAddress === wallet.address ? 'text-emerald-400' : wallet.color}`}
                      data-testid={`button-copy-${wallet.symbol.toLowerCase()}`}
                    >
                      {copiedAddress === wallet.address ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Every contribution, big or small, helps keep the alpha flowing
          </p>
          <div className="flex items-center justify-center gap-1 text-pink-400">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-medium">Thank you for your support!</span>
            <Sparkles className="h-3 w-3" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DonationBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem("donation-banner-dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("donation-banner-dismissed", "true");
    } catch {}
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-orange-500/10 border border-pink-500/20 px-3 sm:px-4 py-3 w-full">
      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shrink-0">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <span className="font-semibold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent text-sm sm:text-base">
              Love the Alpha?
            </span>
            <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">
              Support the project!
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="hidden sm:block">
            <DonationButton variant="floating" />
          </div>
          <div className="sm:hidden">
            <DonationButton variant="default" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
            data-testid="button-dismiss-donation-banner"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
