import { useEffect, useState } from "react";
import { AuthPage } from "@/features/auth/AuthPage";
import { CalculatorPage } from "@/features/calculator/CalculatorPage";
import { AppShell, type AppPage } from "@/features/navigation/AppShell";
import { ProfilePage } from "@/features/teams/ProfilePage";
import { readTheme, saveTheme, type AppTheme } from "@/lib/theme";
import {
  getInitialProfile,
  signOutProfile,
  subscribeToProfileChanges,
  type AppProfile
} from "@/lib/supabase/auth";

export function App() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>(readPageFromHash);
  const [theme, setTheme] = useState<AppTheme>(readTheme);

  useEffect(() => {
    let isMounted = true;

    void getInitialProfile()
      .then((initialProfile) => {
        if (isMounted) setProfile(initialProfile);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const unsubscribe = subscribeToProfileChanges((nextProfile) => {
      setProfile(nextProfile);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => setActivePage(readPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  async function handleLogout() {
    await signOutProfile();
    setProfile(null);
  }

  function handleNavigate(page: AppPage) {
    window.location.hash = page;
    setActivePage(page);
  }

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm font-medium text-muted-foreground">Loading profile...</p>
      </main>
    );
  }

  if (!profile) {
    return <AuthPage onAuthenticated={setProfile} />;
  }

  return (
    <AppShell activePage={activePage} profile={profile} theme={theme} onThemeToggle={handleThemeToggle} onNavigate={handleNavigate} onLogout={() => void handleLogout()}>
      {activePage === "profile" ? (
        <ProfilePage profile={profile} onProfileUpdated={setProfile} />
      ) : (
        <CalculatorPage key={profile.id} profile={profile} />
      )}
    </AppShell>
  );
}

function readPageFromHash(): AppPage {
  return window.location.hash === "#profile" ? "profile" : "calculator";
}
