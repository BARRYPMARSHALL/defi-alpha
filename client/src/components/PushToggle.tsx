import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchPushConfig,
  getPushSubscription,
  isPushSupported,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
  type PushConfig,
} from "@/lib/push";

type State = "loading" | "off" | "unsupported" | "idle" | "subscribed";

/**
 * Browser push-notification toggle. Renders nothing when push is unavailable
 * (unsupported browser, insecure context) or the server has no VAPID keys —
 * so this card only appears where it can actually work.
 */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      const cfg = await fetchPushConfig();
      if (cancelled) return;
      setConfig(cfg);
      if (!cfg.enabled) {
        setState("off");
        return;
      }
      const sub = await getPushSubscription();
      if (cancelled) return;
      setState(sub ? "subscribed" : "idle");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    if (!config) return;
    setBusy(true);
    setNotice(null);
    const result = await subscribeToPush(config);
    setBusy(false);
    if (result.ok) {
      setState("subscribed");
      setNotice("Enabled — APY-change alerts for your watchlist will arrive here.");
    } else if (result.error === "permission-denied") {
      setNotice("Notifications are blocked in your browser settings.");
    } else {
      setNotice("Couldn't enable notifications — try again in a moment.");
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setNotice(null);
    const result = await unsubscribeFromPush();
    setBusy(false);
    if (result.ok) {
      setState("idle");
      setNotice(null);
    } else {
      setNotice("Couldn't disable notifications.");
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setNotice(null);
    const result = await sendTestPush();
    setBusy(false);
    setNotice(result.message);
  };

  if (state === "loading" || state === "off" || state === "unsupported") return null;

  const subscribed = state === "subscribed";

  return (
    <Card className="mb-6">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            subscribed
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {subscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Push alerts</p>
          <p className="text-xs text-muted-foreground">
            {subscribed
              ? "On — this device gets APY-change alerts for your watchlist"
              : "Get notified when a watched pool's APY moves"}
          </p>
          {notice && (
            <p className={`mt-0.5 text-xs ${notice.startsWith("Couldn") || notice.includes("blocked") ? "text-destructive" : "text-muted-foreground"}`}>
              {notice}
            </p>
          )}
        </div>
        {subscribed ? (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={busy}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisable} disabled={busy}>
              Off
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleEnable} disabled={busy} className="shrink-0">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
