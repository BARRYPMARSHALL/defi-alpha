import { describe, it, expect, beforeEach } from "vitest";
import { sendDigestToAllLeads, isEmailConfigured } from "../lib/email";
import { storage } from "../storage";

describe("email digest (dry-run without key)", () => {
  beforeEach(async () => {
    delete process.env.RESEND_API_KEY;
    // seed a lead so the dry-run has something to iterate
    await storage.addLead("dryrun@example.com", "test");
  });

  it("reports not configured without a key", () => {
    expect(isEmailConfigured()).toBe(false);
  });

  it("dry-runs safely (no throw) when no key is set", async () => {
    const result = await sendDigestToAllLeads();
    expect(result.mode).toBe("dry-run");
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});
