import { describe, expect, it } from "vitest";
import { isValidEmailAddress, normalizeEmail } from "@/lib/supabase/email-validation";

describe("signup email validation", () => {
  it("normalizes a normal address and accepts valid domains", () => {
    expect(normalizeEmail(" Trainer+One@Example.COM ")).toBe("trainer+one@example.com");
    expect(isValidEmailAddress("trainer+one@example.com")).toBe(true);
    expect(isValidEmailAddress("a@sub.example.co.uk")).toBe(true);
  });

  it.each([
    "bad", "a@@example.com", "a..b@example.com", ".a@example.com",
    "a@-example.com", "a@example..com", "a@example.c", "a@localhost",
    `${"a".repeat(65)}@example.com`
  ])("rejects an invalid address before registration: %s", (email) => {
    expect(isValidEmailAddress(email)).toBe(false);
  });
});
