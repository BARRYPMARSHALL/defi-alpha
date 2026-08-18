import { Link } from "wouter";
import { LogIn, LogOut, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

export function AuthButton({ compact = false }: { compact?: boolean }) {
  const { user, loading, logout, isPro } = useAuth();

  if (loading) {
    return <Button variant="ghost" size="icon" disabled aria-label="Loading account"><User className="h-4 w-4" /></Button>;
  }

  if (!user) {
    return (
      <Link href="/auth">
        <Button variant="outline" size={compact ? "sm" : "default"} data-testid="button-signin">
          <LogIn className="h-4 w-4 mr-1" />
          {compact ? "" : "Sign in"}
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "default"} data-testid="button-account">
          <User className="h-4 w-4 mr-1" />
          <span className="max-w-20 truncate">{user.username}</span>
          {isPro && <Crown className="h-3.5 w-3.5 ml-1 text-amber-500" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <span className="truncate">{user.username}</span>
            <Badge variant={isPro ? "default" : "outline"} className="text-[10px]">
              {isPro ? <><Crown className="h-3 w-3 mr-0.5" />Pro</> : "Free"}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
