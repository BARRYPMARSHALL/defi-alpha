import { useState, useRef, useEffect } from "react";
import { Brain, Send, Loader2, Sparkles, AlertCircle, Crown } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  isPro: boolean;
}

const SUGGESTIONS = [
  "Best stablecoin yields right now?",
  "Top pools on Arbitrum?",
  "Safe pools with auto-compounding?",
  "High APY opportunities?",
];

export function AlphaBrainPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"llm" | "local" | "checking">("checking");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/chat/status")
      .then((r) => r.json())
      .then((data) => {
        setMode(data.mode);
        if (data.usage) setUsage(data.usage);
      })
      .catch(() => setMode("local"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: conversationIdRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "ai_limit_reached") {
          setLimitHit(true);
          setUsage(data.usage);
        }
        throw new Error(data.error || "Failed to get a reply");
      }
      conversationIdRef.current = data.conversationId;
      setMode(data.mode);
      if (data.usage) setUsage(data.usage);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Alpha Brain
          {mode !== "checking" && (
            <Badge variant={mode === "llm" ? "default" : "outline"} className="ml-auto">
              {mode === "llm" ? (
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI mode</span>
              ) : (
                "Local advisor"
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 rounded-md border bg-muted/30 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Ask about yields — I read live DeFiLlama data.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-background border"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 self-start rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Alpha Brain is thinking…
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {limitHit && (
          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <p className="flex items-center gap-1 font-medium text-amber-500">
              <Crown className="h-4 w-4" /> Free limit reached
            </p>
            <p className="text-muted-foreground mt-1">
              You've used your free AI messages for today. Upgrade to Pro for unlimited Alpha Brain.
            </p>
            <Link href="/checkout">
              <Button size="sm" className="mt-2 w-full" variant="default">
                <Crown className="h-3.5 w-3.5 mr-1" /> Go Pro — $12/mo
              </Button>
            </Link>
          </div>
        )}

        {error && !limitHit && (
          <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about yields…"
            className="min-h-10 flex-1 resize-none"
            rows={1}
          />
          <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {usage && !usage.isPro && remaining !== null && remaining > 0 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {remaining} free AI {remaining === 1 ? "msg" : "msgs"} left today
          </p>
        )}
      </CardContent>
    </Card>
  );
}
