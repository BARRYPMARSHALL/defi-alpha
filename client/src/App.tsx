import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/hooks/use-auth";
import { MobileNav } from "@/components/MobileNav";
import Dashboard from "@/pages/dashboard";
import WatchlistPage from "@/pages/watchlist";
import MorePage from "@/pages/more";
import Learn from "@/pages/learn";
import Analytics from "@/pages/analytics";
import Portfolio from "@/pages/portfolio";
import Stablecoins from "@/pages/stablecoins";
import AuthPage from "@/pages/auth";
import CheckoutPage from "@/pages/checkout";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/more" component={MorePage} />
      <Route path="/learn" component={Learn} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/stablecoins" component={Stablecoins} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/welcome" component={LandingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
            <MobileNav />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
