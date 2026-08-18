import heroBanner from "@assets/x1_1768343977535.png";

interface LoadingSplashProps {
  isLoading: boolean;
}

export function LoadingSplash({ isLoading }: LoadingSplashProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-500"
      data-testid="loading-splash"
    >
      <div className="flex flex-col items-center gap-6 max-w-lg px-4">
        <img 
          src={heroBanner} 
          alt="DeFi Alpha Agent" 
          className="w-full max-w-md rounded-xl shadow-2xl animate-pulse"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground">Loading yield opportunities...</p>
        </div>
      </div>
    </div>
  );
}
