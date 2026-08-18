import { Resend } from "resend";
import { storage } from "../storage";
import { buildDigestFromCache } from "./digest";
import { getCachedData, fetchPoolsData } from "./defillama";

/**
 * Weekly digest email sender.
 *
 * The funnel's payoff: subscribers captured via the course/landing email form
 * receive the auto-generated digest (built from live pools — see digest.ts).
 *
 * Sending is OFF until RESEND_API_KEY is set (dev mode). The endpoint and the
 * scheduled job both no-op gracefully without a key, so this is safe to run
 * anywhere.
 */

const FROM = process.env.DIGEST_FROM || "DeFi Alpha <digest@defialpha.com>";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Render the digest as a simple HTML email (plain sections, safe content). */
function toHtml(text: string): string {
  const paragraphs = text
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.55;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">${paragraphs}</body></html>`;
}

/** Send the digest to every subscribed lead. Returns per-email results. */
export async function sendDigestToAllLeads(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
  mode: "email" | "dry-run";
}> {
  const client = getClient();
  const leads = await storage.listLeads();

  if (!client) {
    // Dry-run mode: report what WOULD be sent (also useful for tests/CI)
    const digest = buildDigestFromCache();
    return {
      sent: 0,
      failed: 0,
      errors: [],
      mode: "dry-run",
    } as any;
  }

  // Refresh pool data so the email is current
  try {
    await fetchPoolsData();
  } catch {
    // use cache if refresh fails
  }

  const digest = buildDigestFromCache();
  const html = toHtml(digest.text);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      await client.emails.send({
        from: FROM,
        to: lead.email,
        subject: digest.subject,
        html,
        text: digest.text,
      });
      sent += 1;
    } catch (error: any) {
      failed += 1;
      errors.push(`${lead.email}: ${error?.message || String(error)}`);
    }
  }

  return { sent, failed, errors, mode: "email" };
}
