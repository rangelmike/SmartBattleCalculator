import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ supabase: null }));

import { getInitialProfile, signInWithGoogle, signInWithProfile } from "@/lib/supabase/auth";

describe("authentication without Supabase", () => {
  it("does not trust an old local profile or accept a passwordless local login", async () => {
    localStorage.setItem("sbc.local-profile", JSON.stringify({
      id: "local-trainer@example.com", email: "trainer@example.com", username: "Trainer", isLocal: true
    }));
    await expect(getInitialProfile()).resolves.toBeNull();
    await expect(signInWithProfile("trainer@example.com", "wrong-password")).rejects.toThrow("Authentication is unavailable");
    await expect(signInWithGoogle()).rejects.toThrow("Authentication is unavailable");
    localStorage.removeItem("sbc.local-profile");
  });
});
