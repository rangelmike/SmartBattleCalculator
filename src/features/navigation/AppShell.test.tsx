import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/features/navigation/AppShell";
import type { AppProfile } from "@/lib/supabase/auth";

const profile: AppProfile = { id: "local-trainer", email: "trainer@example.com", username: "Trainer", isLocal: true };

describe("app header theme toggle", () => {
  it("places the toggle before the username and switches its accessible label", () => {
    const onThemeToggle = vi.fn();
    const { rerender } = render(<AppShell activePage="calculator" profile={profile} theme="dark" onThemeToggle={onThemeToggle} onNavigate={vi.fn()} onLogout={vi.fn()}><p>Calculator content</p></AppShell>);
    const toggle = screen.getByRole("button", { name: "Switch to light mode" });
    const username = screen.getByText("Trainer");
    expect(toggle.compareDocumentPosition(username) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(onThemeToggle).toHaveBeenCalledOnce();

    rerender(<AppShell activePage="calculator" profile={profile} theme="light" onThemeToggle={onThemeToggle} onNavigate={vi.fn()} onLogout={vi.fn()}><p>Calculator content</p></AppShell>);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toHaveAttribute("aria-pressed", "false");
  });
});
