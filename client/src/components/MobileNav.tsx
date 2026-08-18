import { useLocation } from "wouter";
import { Home, Layers, Briefcase, Coins, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/yields", label: "Yields", icon: Layers },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/stablecoins", label: "Stables", icon: Coins },
  { href: "/learn", label: "Learn", icon: GraduationCap },
];

/**
 * Mobile-first navigation:
 *  - Bottom tab bar on phones (thumb-friendly, 5 tabs max, safe-area aware)
 *  - Hidden on desktop (desktop keeps the top Header)
 */
export function MobileNav() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
