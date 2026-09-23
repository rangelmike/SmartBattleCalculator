import { describe, expect, it, vi } from "vitest";
import { canReceiveEmail } from "../../../supabase/functions/validate-signup-email/domain-check";

function dnsFetcher(records: Record<string, { Status: number; Answer?: { type: number; data: string }[] }>) {
  return vi.fn((url: string | URL | Request) => {
    const request = new URL(url instanceof Request ? url.url : url);
    const type = request.searchParams.get("type") ?? "";
    return Promise.resolve({ ok: true, json: () => Promise.resolve(records[type] ?? { Status: 0 }) } as Response);
  }) as typeof fetch;
}

describe("signup domain mail routing", () => {
  it("accepts a domain with MX and rejects a null MX or unknown domain", async () => {
    expect(await canReceiveEmail("example.com", dnsFetcher({ MX: { Status: 0, Answer: [{ type: 15, data: "10 mail.example.com." }] } }))).toBe(true);
    expect(await canReceiveEmail("example.com", dnsFetcher({ MX: { Status: 0, Answer: [{ type: 15, data: "0 ." }] } }))).toBe(false);
    expect(await canReceiveEmail("invalid.example", dnsFetcher({ MX: { Status: 3 } }))).toBe(false);
  });

  it("allows SMTP address fallback but fails closed on a DNS outage", async () => {
    expect(await canReceiveEmail("example.com", dnsFetcher({ MX: { Status: 0 }, A: { Status: 0, Answer: [{ type: 1, data: "192.0.2.1" }] } }))).toBe(true);
    expect(await canReceiveEmail("example.com", dnsFetcher({ MX: { Status: 0 }, A: { Status: 0 }, AAAA: { Status: 0 } }))).toBe(false);
    await expect(canReceiveEmail("example.com", dnsFetcher({ MX: { Status: 2 } }))).rejects.toThrow("DNS lookup failed");
  });
});
