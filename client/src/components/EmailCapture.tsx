import { useState } from "react";
import { Mail, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailCaptureProps {
  /** Where the signup came from (course / home / digest). */
  source?: string;
  /** Title shown above the form. */
  title?: string;
  /** Value prop — why should they hand over the email? */
  description?: string;
  compact?: boolean;
}

/**
 * Email capture — the funnel's lead magnet. Used on the course page with a
 * concrete value prop (weekly yield digest), never as a nag.
 */
export function EmailCapture({
  source = "course",
  title = "The weekly yield digest",
  description = "One email a week: the top 5 risk-adjusted opportunities, what changed, and what to avoid. Free forever.",
  compact = false,
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong");
      }
      setStatus("done");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> You're on the list!
        </p>
        <p className="text-muted-foreground mt-1">
          The next yield digest is on its way. Meanwhile, explore the live tool — it's free.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-lg border bg-muted/30 p-4 sm:p-5"}>
      <div className="flex items-start gap-2 mb-2">
        <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 h-10"
          required
          autoComplete="email"
          aria-label="Email address"
        />
        <Button type="submit" disabled={status === "submitting" || !email} className="h-10 shrink-0">
          {status === "submitting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Get the digest
        </Button>
      </form>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
