import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Mail, Check, Download } from "lucide-react";

interface EmailCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "defi-email-captured";

export function EmailCapture({ open, onOpenChange }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    localStorage.setItem(STORAGE_KEY, email);
    setSubmitted(true);
    setLoading(false);

    toast({
      title: "Success!",
      description: "Check your email for the DeFi cheat sheet.",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    if (submitted) {
      setEmail("");
      setSubmitted(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {submitted ? "Check Your Email!" : "Get the DeFi Cheat Sheet"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {submitted 
              ? "We've sent the PDF to your inbox. Happy farming!"
              : "A one-page PDF with key formulas, risk indicators, and quick tips for DeFi yield farming."
            }
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-chart-2/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-chart-2 text-white">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email sent to:</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full" data-testid="button-close-email-capture">
              Continue Learning
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">APY Calculator</Badge>
                <Badge variant="outline">Risk Checklist</Badge>
                <Badge variant="outline">IL Formula</Badge>
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                data-testid="input-email-capture"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-submit-email"
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Send Me the Cheat Sheet
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EmailCaptureButton() {
  const [open, setOpen] = useState(false);
  const alreadyCaptured = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);

  if (alreadyCaptured) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-primary/5 border-primary/20 hover:bg-primary/10"
        data-testid="button-get-cheat-sheet"
      >
        <FileText className="h-4 w-4 mr-2" />
        Get Cheat Sheet
      </Button>
      <EmailCapture open={open} onOpenChange={setOpen} />
    </>
  );
}
