import { useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dev/QA aid: preview the app in a phone-sized iframe with its own viewport.
 * Because the iframe has a real 390x844 viewport, ALL responsive behavior
 * (Tailwind breakpoints, bottom nav via useIsMobile, filter sheets) renders
 * exactly as it would on a phone — so Barry can check mobile for errors
 * without opening DevTools. Desktop-only control.
 */
export function MobilePreview() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("/");

  useEffect(() => {
    if (open) setUrl(window.location.pathname + window.location.search);
  }, [open]);

  return (
    <>
      {/* Toggle — floating, visible on desktop only */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex fixed bottom-4 right-4 z-[90] items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur px-3 py-2 text-xs font-medium shadow-md hover:shadow-lg transition-shadow"
        aria-label="Open mobile preview"
        data-testid="button-mobile-preview"
      >
        <Smartphone className="h-4 w-4 text-primary" />
        Mobile view
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Phone frame header */}
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Mobile preview
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{url}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {/* Phone-sized iframe: 390x844 ≈ iPhone 14 */}
            <iframe
              src={url}
              title="Mobile preview"
              className="bg-white"
              style={{ width: 390, height: 844 }}
              data-testid="iframe-mobile-preview"
            />
          </div>
        </div>
      )}
    </>
  );
}
