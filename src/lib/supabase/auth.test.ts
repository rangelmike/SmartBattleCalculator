import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signInWithOAuth: vi.fn(), signUp: vi.fn(), invoke: vi.fn(), maybeSingle: vi.fn()
}));
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { signInWithPassword: mocks.signInWithPassword, signInWithOAuth: mocks.signInWithOAuth, signUp: mocks.signUp },
    functions: { invoke: mocks.invoke },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) })
  }
}));

import { createProfile, getOAuthReturnUrl, signInWithGoogle, signInWithProfile } from "@/lib/supabase/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.maybeSingle.mockResolvedValue({ data: { username: "Trainer" } });
  mocks.invoke.mockResolvedValue({ data: { valid: true }, error: null });
});

describe("account authentication", () => {
  it("returns to the app root after Google OAuth, including the GitHub Pages base path", async () => {
    expect(getOAuthReturnUrl("https://rangelmike.github.io", "/SmartBattleCalculator/")).toBe(
      "https://rangelmike.github.io/SmartBattleCalculator/"
    );
    expect(getOAuthReturnUrl("http://127.0.0.1:5175", "/")).toBe("http://127.0.0.1:5175/");
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    await signInWithGoogle();
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: getOAuthReturnUrl(window.location.origin, import.meta.env.BASE_URL) }
    });
  });

  it("reports a Google OAuth startup failure", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: new Error("Provider unavailable") });
    await expect(signInWithGoogle()).rejects.toThrow("Provider unavailable");
  });

  it("never registers an existing email when sign-in fails", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error("Invalid login credentials") });
    await expect(signInWithProfile("TRAINER@example.com", "wrong-password")).rejects.toThrow("Invalid login credentials");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "trainer@example.com", password: "wrong-password" });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("returns a profile only after a valid password produces a session", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-1", email: "trainer@example.com", user_metadata: {} } } }, error: null
    });
    await expect(signInWithProfile("trainer@example.com", "correct-password")).resolves.toMatchObject({ id: "user-1", username: "Trainer", isLocal: false });
  });

  it("blocks malformed email before calling auth or email-domain verification", async () => {
    await expect(createProfile("wrong@@example.com", "password" )).rejects.toThrow("valid email");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("blocks an undeliverable domain before sending signup email", async () => {
    mocks.invoke.mockResolvedValue({ data: { valid: false }, error: null });
    await expect(createProfile("trainer@invalid.example", "password")).rejects.toThrow("cannot receive mail");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not open a duplicate account when Supabase returns an obfuscated user", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    await expect(createProfile("trainer@example.com", "password", "Trainer")).rejects.toThrow("already uses this email");
    expect(mocks.invoke).toHaveBeenCalledWith("validate-signup-email", { body: { email: "trainer@example.com" } });
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
  });

  it("reports a confirmation step for a new account without a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { identities: [{ id: "identity-1" }] }, session: null }, error: null });
    await expect(createProfile("trainer@example.com", "password", "Trainer")).resolves.toBeNull();
  });
});
