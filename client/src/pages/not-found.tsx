import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Brain } from "lucide-react";

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

          <Button asChild className="w-full" data-testid="button-go-home">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Brain className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Not sure where to start?</p>
                <p className="text-xs text-muted-foreground">Ask Alpha Brain to find the best yields for you</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
