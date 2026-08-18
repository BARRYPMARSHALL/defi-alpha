import { Link } from "wouter";
import { RefreshCw, Star, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "./AuthButton";
import { WalletButton } from "./WalletButton";
import logoImage from "@assets/33_1775959909661.png";

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string | null;
  /** Optional element rendered in the header action row (e.g. AlertBell). */
  rightSlot?: React.ReactNode;
}

/**
 * Clean, minimal header: logo + primary nav (desktop), auth/refresh/theme.
 * Mobile navigation lives in the bottom tab bar, so the mobile row stays to
 * a single line: logo + refresh + auth + theme.
 */
export function Header({ onRefresh, isRefreshing = false, lastUpdated, rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* Desktop Layout */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 h-16 items-center justify-between gap-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home">
            <img
              src={logoImage}
              alt="DeFi Alpha"
              className="w-10 h-10 rounded-md object-cover"
              data-testid="img-logo"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight" data-testid="text-app-title">
                DeFi Alpha
              </h1>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground" data-testid="text-last-updated">
                  Updated {lastUpdated}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/watchlist">
            <Button variant="ghost" size="sm" data-testid="button-watchlist">
              <Star className="h-4 w-4 mr-2" />
              Watchlist
            </Button>
          </Link>
          <Link href="/more">
            <Button variant="ghost" size="sm" data-testid="button-more">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              More
            </Button>
          </Link>

          {rightSlot}

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}

          <WalletButton />
          <AuthButton compact />
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
            <WalletButton />
            <AuthButton compact />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
