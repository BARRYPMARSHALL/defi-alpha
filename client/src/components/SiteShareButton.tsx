import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SiX, SiTelegram, SiDiscord, SiReddit, SiFacebook, SiWhatsapp } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";

const SITE_URL = "https://defialpha.com";
const SHARE_TEXT = "DeFi Alpha — find the safest high yields across 100+ chains, ranked by real risk-adjusted return.";

interface SiteShareButtonProps {
  /** Optional context text; defaults to the site pitch. */
  text?: string;
  compact?: boolean;
}

/**
 * Site-wide social share button. On mobile it prefers the native share sheet;
 * otherwise a dropdown with X/Telegram/Discord/Reddit/Facebook/LinkedIn/
 * WhatsApp + copy link. Shown in the header so every page can share.
 */
export function SiteShareButton({ text = SHARE_TEXT, compact = false }: SiteShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const url = typeof window !== "undefined" ? window.location.href : SITE_URL;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with your friends." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "DeFi Alpha", text, url });
        return;
      } catch {
        // user cancelled or unsupported — fall through to dropdown
      }
    }
  };

  const links = [
    { name: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, icon: SiX },
    { name: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, icon: SiTelegram },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, icon: SiWhatsapp },
    { name: "Reddit", href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent("DeFi Alpha")}`, icon: SiReddit },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: SiFacebook },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: FaLinkedin },
    // Discord has no web share intent — this item copies the link instead
    { name: "Discord", href: "", copy: true, icon: SiDiscord },
  ];

  /** Discord: copy the link so the user can paste it into a server. */
  const copyForDiscord = async () => {
    await copyLink();
    toast({ title: "Link copied", description: "Paste it in your Discord server." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={compact ? "h-8 w-8" : ""}
          onClick={handleNativeShare}
          aria-label="Share"
          data-testid="button-site-share"
        >
          <Share2 className="h-4 w-4" />
          {!compact && <span className="ml-1 hidden sm:inline">Share</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Share DeFi Alpha</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map(({ name, href, copy, icon: Icon }) =>
          copy ? (
            <DropdownMenuItem key={name} onClick={copyForDiscord} className="gap-2 cursor-pointer">
              <Icon className="h-4 w-4" />
              {name} (copy link)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={name} asChild className="gap-2 cursor-pointer">
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Icon className="h-4 w-4" />
                {name}
              </a>
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
