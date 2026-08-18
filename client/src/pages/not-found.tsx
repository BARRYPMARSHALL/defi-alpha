import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Heart, Coffee } from "lucide-react";
import { DonationButton } from "@/components/DonationButton";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
          </div>

          <p className="text-muted-foreground">
            Oops! Looks like this yield opportunity doesn't exist. Let's get you back to finding alpha.
          </p>

          <Link href="/">
            <Button className="w-full" data-testid="button-go-home">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20">
              <Coffee className="h-5 w-5 text-pink-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Lost but not forgotten!</p>
                <p className="text-xs text-muted-foreground">Help keep us online with a coffee</p>
              </div>
              <DonationButton variant="compact" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
