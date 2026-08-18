import { Wallet, ExternalLink, Loader2, LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet, debankProfileUrl, zerionProfileUrl } from "@/hooks/use-wallet";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, connected, available, connecting, connect, disconnect } = useWallet();

  if (!available) {
    // No injected wallet (e.g. plain browser) — hidden; app works fine without
    return null;
  }

  if (!connected) {
    return (
      <Button variant="outline" size="sm" onClick={connect} disabled={connecting} data-testid="button-connect-wallet">
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span className="ml-1">Connect</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono" data-testid="button-wallet-connected">
          <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" />
          {shortAddress(address!)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-mono text-xs">{address}</div>
          <div className="text-xs text-muted-foreground mt-0.5">View positions on-chain</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={debankProfileUrl(address!)} target="_blank" rel="noopener noreferrer" className="gap-2 cursor-pointer">
            <ExternalLink className="h-4 w-4" /> Open in DeBank
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={zerionProfileUrl(address!)} target="_blank" rel="noopener noreferrer" className="gap-2 cursor-pointer">
            <ExternalLink className="h-4 w-4" /> Open in Zerion
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="gap-2 cursor-pointer">
          <LogOut className="h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
