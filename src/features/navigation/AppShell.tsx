import type { ReactNode } from "react";
import { Calculator, LogOut, UserRound } from "lucide-react";
import type { AppProfile } from "@/lib/supabase/auth";

export type AppPage = "calculator" | "profile";

type AppShellProps = {
  activePage: AppPage;
  children: ReactNode;
  profile: AppProfile;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
};

export function AppShell({ activePage, children, profile, onNavigate, onLogout }: AppShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button className="text-left" type="button" onClick={() => onNavigate("calculator")}>
            <p className="text-sm font-semibold text-primary">Smart Battle Calculator</p>
            <p className="text-base font-semibold sm:text-lg">Pokemon battles</p>
          </button>

          <nav className="order-3 grid w-full grid-cols-2 rounded-md bg-muted p-1 sm:order-none sm:w-auto" aria-label="Main navigation">
            <NavButton active={activePage === "calculator"} onClick={() => onNavigate("calculator")}>
              <Calculator aria-hidden className="h-4 w-4" />
              Calculator
            </NavButton>
            <NavButton active={activePage === "profile"} onClick={() => onNavigate("profile")}>
              <UserRound aria-hidden className="h-4 w-4" />
              Profile
            </NavButton>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm font-medium text-muted-foreground md:block">
              {profile.username}
            </span>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border transition hover:bg-secondary"
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {children}
    </main>
  );
}

type NavButtonProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

function NavButton({ active, children, onClick }: NavButtonProps) {
  return (
    <button
      className={`flex h-9 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}
