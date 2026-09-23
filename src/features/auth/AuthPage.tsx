import { useEffect, useState } from "react";
import { ChevronDown, LogIn } from "lucide-react";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { describeServiceError } from "@/lib/supabase/service-error";

type AuthPageProps = { initialError?: string | null };

const features = [
  {
    title: "Save your teams",
    summary: "Sign in to keep your battle preparation in one place.",
    detail: "Create an account, then save your own and opposing teams. Your sets stay available when you return, so you do not have to rebuild a matchup."
  },
  {
    title: "Import Pokepastes or text",
    summary: "Bring a full team into your library in one step.",
    detail: "Paste a Pokepaste link or Showdown-formatted text, name the team, and choose its source. This keeps imported moves, items, and spreads ready to inspect or edit."
  },
  {
    title: "Estimate opponent stats",
    summary: "Use observed damage to narrow down a rival's spread.",
    detail: "Record the percent dealt by one of your moves or the HP lost to a rival's move, then open the opponent estimate. Matching damage rolls help reveal plausible EVs and natures."
  },
  {
    title: "Calculate with common sets",
    summary: "Start a damage check without filling every set by hand.",
    detail: "Pick an individual Pokemon to load its most-used popular moves, item, ability, EVs, and nature when available. Adjust the set before calculating if your matchup calls for it."
  },
  {
    title: "Keep familiar matchups close",
    summary: "Organize your teams and opponents you face often.",
    detail: "Save and manage your own teams and recurring opposing teams in the profile. Keeping difficult matchups makes them quick to revisit before a rematch."
  },
  {
    title: "Tune the opponent",
    summary: "Test different natures and stat stages immediately.",
    detail: "Change the opponent's nature or raise and lower its stat stages in the calculator. Damage updates so you can check how a faster, bulkier, or boosted set changes the matchup."
  },
  {
    title: "Start a new battle",
    summary: "Clear temporary battle conditions quickly.",
    detail: "Use New battle to reset the field and the opposing side for a fresh scenario. Temporary HP and stat changes are cleared instead of carrying into the next fight."
  },
  {
    title: "Find the opponent's team",
    summary: "Search your library and Popular teams.",
    detail: "Search saved opponents or Popular teams by name, source, or included Pokemon. This helps you load a familiar matchup even when you remember only part of its roster."
  },
  {
    title: "Add several Pokemon at once",
    summary: "Build a calculator roster from a search.",
    detail: "Enter multiple Pokemon names in the included-Pokemon search and add them together. It is useful when you know a few opposing picks but not the full team."
  }
] as const;

export function AuthPage({ initialError }: AuthPageProps) {
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(readGoogleRedirectError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (readGoogleRedirectError()) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(describeServiceError(authError, "Could not sign in with Google."));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-center lg:gap-16 lg:px-8">
        <section className="order-2 min-w-0 lg:order-1" aria-label="Calculator features">
          <h1 className="text-3xl font-semibold sm:text-4xl">Smart Battle Calculator</h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">Prepare your teams and inspect every matchup before battle.</p>
          <div id="feature-details" className="mt-7 border-t border-border">
            {features.slice(0, showMore ? features.length : 4).map((feature) => (
              <div key={feature.title} className="border-b border-border py-3">
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{feature.summary}</p>
                {showMore ? <p className="mt-1.5 text-sm leading-6 text-foreground/85">{feature.detail}</p> : null}
              </div>
            ))}
          </div>
          <button className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline" type="button" aria-expanded={showMore} aria-controls="feature-details" onClick={() => setShowMore((current) => !current)}>
            {showMore ? "View less" : "View more"}
            <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>
        </section>

        <section className="order-1 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-8 lg:order-2 lg:self-start" aria-label="Sign in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogIn aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Sign in</h2>
              <p className="text-sm text-muted-foreground">Use your Google account to save your teams.</p>
            </div>
          </div>
          {error || initialError ? <p className="mt-4 text-sm font-medium text-destructive" role="alert">{error ?? initialError}</p> : null}
          <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isSubmitting} onClick={() => void handleGoogleSignIn()}>
            <LogIn aria-hidden className="h-4 w-4" />
            {isSubmitting ? "Connecting to Google..." : "Continue with Google"}
          </button>
        </section>
      </div>
    </main>
  );
}

function readGoogleRedirectError() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.has("error") || params.has("error_code")
    ? "Google sign-in was canceled or could not be completed. Please try again."
    : null;
}
