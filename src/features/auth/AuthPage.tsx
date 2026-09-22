import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { signInWithProfile, type AppProfile } from "@/lib/supabase/auth";

type AuthPageProps = {
  onAuthenticated: (profile: AppProfile) => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const profile = await signInWithProfile(email, password, username);

      if (!profile) {
        setStatus("Account created. Check your email if Supabase requires confirmation.");
        return;
      }

      onAuthenticated(profile);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Smart Battle Calculator</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Your teams, ready before the battle
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Sign in to save teams, import Pokepastes or Showdown text, and prepare for battle.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden className="h-5 w-5 text-accent" />
            <span>Supabase authentication when configured; a local profile for development.</span>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="rounded-lg border border-border bg-card p-6 shadow-sm"
          aria-label="Sign in"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogIn aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Sign in</h2>
              <p className="text-sm text-muted-foreground">Enter your email, password, and username.</p>
            </div>
          </div>

          <label className="mt-6 grid gap-2 text-sm font-medium">
            Email
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-base outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="mt-4 grid gap-2 text-sm font-medium">
            Password
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-base outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
            />
          </label>

          <label className="mt-4 grid gap-2 text-sm font-medium">
            Username
            <input
              className="h-11 rounded-md border border-input bg-background px-3 text-base outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="nickname"
              placeholder="Trainer"
            />
          </label>

          {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
          {status ? <p className="mt-4 text-sm font-medium text-accent">{status}</p> : null}

          <button
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            <LogIn aria-hidden className="h-4 w-4" />
            {isSubmitting ? "Signing in..." : "Sign in or create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
