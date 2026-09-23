import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { assertValidEmailAddress, normalizeEmail } from "@/lib/supabase/email-validation";

export type AppProfile = {
  id: string;
  email: string;
  username: string;
  isLocal: boolean;
};

export type AuthChangeHandler = (profile: AppProfile | null) => void;

const localProfileKey = "sbc.local-profile";

export async function getInitialProfile() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return sessionToProfile(data.session);
}

export function getOAuthReturnUrl(origin: string, basePath: string) {
  return new URL(basePath, origin).toString();
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Authentication is unavailable. Configure Supabase to sign in.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getOAuthReturnUrl(window.location.origin, import.meta.env.BASE_URL) }
  });
  if (error) throw error;
}

export function subscribeToProfileChanges(handler: AuthChangeHandler) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void sessionToProfile(session).then(handler);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithProfile(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmailAddress(normalizedEmail);
  if (!password) throw new Error("Password is required.");
  if (!supabase) throw new Error("Authentication is unavailable. Configure Supabase to sign in.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) throw error;
  if (!data.session) throw new Error("Could not start a session. Try signing in again.");

  return sessionToProfile(data.session);
}

export async function createProfile(email: string, password: string, username?: string) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmailAddress(normalizedEmail);
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!supabase) throw new Error("Authentication is unavailable. Configure Supabase to create an account.");

  const validationResponse = await supabase.functions.invoke("validate-signup-email", {
    body: { email: normalizedEmail }
  });
  if (validationResponse.error) throw new Error("Could not verify the email domain. Try again later.");
  const validation: unknown = validationResponse.data;
  if (!validation || typeof validation !== "object" || !("valid" in validation) || validation.valid !== true) {
    throw new Error("That email domain cannot receive mail. Check the address.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { username: username?.trim() || normalizedEmail.split("@")[0] } }
  });
  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      throw new Error("An account already uses this email. Sign in with its password.");
    }
    throw error;
  }
  if (data.user?.identities?.length === 0) {
    throw new Error("An account already uses this email. Sign in with its password.");
  }
  if (!data.user) throw new Error("Could not create the account. Try again.");
  return sessionToProfile(data.session);
}

export async function signOutProfile() {
  if (!supabase) {
    localStorage.removeItem(localProfileKey);
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function updateProfileUsername(profile: AppProfile, username: string) {
  const nextUsername = username.trim();

  if (!nextUsername) {
    throw new Error("Username cannot be empty.");
  }

  if (!supabase || profile.isLocal) {
    const updated = { ...profile, username: nextUsername };
    localStorage.setItem(localProfileKey, JSON.stringify(updated));
    return updated;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: nextUsername })
    .eq("id", profile.id);

  if (error) {
    throw error;
  }

  return { ...profile, username: nextUsername };
}

async function sessionToProfile(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  const userMetadata = session.user.user_metadata as Record<string, unknown>;
  const metadataUsername = typeof userMetadata.username === "string" ? userMetadata.username : undefined;
  const fallbackUsername = metadataUsername ?? session.user.email?.split("@")[0] ?? "Trainer";

  const { data } = await supabase!
    .from("profiles")
    .select("username")
    .eq("id", session.user.id)
    .maybeSingle();

  const profileRow = data as { username?: unknown } | null;
  const storedUsername = typeof profileRow?.username === "string" ? profileRow.username : undefined;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    username: storedUsername ?? fallbackUsername,
    isLocal: false
  };
}
