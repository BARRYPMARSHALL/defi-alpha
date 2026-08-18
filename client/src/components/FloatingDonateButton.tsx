import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { DonationButton } from "@/components/DonationButton";

export function FloatingDonateButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem("floating-donate-dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 200);
    };

    // Show after a short delay even without scroll
    const timer = setTimeout(() => setIsVisible(true), 3000);

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, []);

  if (isDismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
        <DonationButton variant="floating-icon" />
      </div>
    </div>
  );
}
