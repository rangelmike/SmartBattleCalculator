import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

import { AuthPage } from "@/features/auth/AuthPage";

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("Google-only authentication page", () => {
  it("offers only Google sign-in and starts the OAuth redirect", async () => {
    mocks.signInWithGoogle.mockResolvedValue(undefined);
    render(<AuthPage />);
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Connecting to Google..." })).toBeDisabled();
  });

  it("lets the user retry when the provider cannot start", async () => {
    mocks.signInWithGoogle.mockRejectedValue(new Error("Provider unavailable"));
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("shows a canceled OAuth callback without leaving its error in the URL", () => {
    window.location.hash = "error=access_denied&error_description=Access+denied";
    render(<AuthPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Google sign-in was canceled");
    expect(window.location.hash).toBe("");
  });

  it("expands practical guidance for all features", () => {
    render(<AuthPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "View more" }));
    expect(screen.getByText(/Record the percent dealt by one of your moves or the HP lost/)).toBeVisible();
    expect(screen.getByText(/Keeping difficult matchups makes them quick to revisit/)).toBeVisible();
    expect(screen.getByText(/Enter multiple Pokemon names/)).toBeVisible();
    expect(screen.getByRole("button", { name: "View less" })).toHaveAttribute("aria-expanded", "true");
  });
});
