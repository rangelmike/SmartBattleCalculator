import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

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
    return readLocalProfile();
  }

  const { data } = await supabase.auth.getSession();
  return sessionToProfile(data.session);
}

export function subscribeToProfileChanges(handler: AuthChangeHandler) {
  if (!supabase) {
    window.addEventListener("storage", () => handler(readLocalProfile()));
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void sessionToProfile(session).then(handler);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithProfile(email: string, password: string, username?: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  if (!supabase) {
    const profile = {
      id: `local-${normalizedEmail}`,
      email: normalizedEmail,
      username: username?.trim() || normalizedEmail.split("@")[0] || "Trainer",
      isLocal: true
    };
    localStorage.setItem(localProfileKey, JSON.stringify(profile));
    return profile;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: username?.trim() || normalizedEmail.split("@")[0]
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    return sessionToProfile(signUpData.session);
  }

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

function readLocalProfile() {
  const rawProfile = localStorage.getItem(localProfileKey);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile) as AppProfile;
  } catch {
    localStorage.removeItem(localProfileKey);
    return null;
  }
}
