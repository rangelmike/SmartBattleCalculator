import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "@/features/teams/ProfilePage";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import type { AppProfile } from "@/lib/supabase/auth";

const mocks = vi.hoisted(() => ({
  canManage: vi.fn(),
  search: vi.fn(),
  loadLibrary: vi.fn()
}));

vi.mock("@/lib/supabase/popular-teams", () => ({
  canManagePopularTeams: mocks.canManage,
  searchPopularTeams: mocks.search,
  suggestPopularPokemon: vi.fn().mockResolvedValue([]),
  suggestPopularSources: vi.fn().mockResolvedValue([]),
  createPopularTeam: vi.fn(),
  updatePopularTeam: vi.fn(),
  deletePopularTeam: vi.fn()
}));

vi.mock("@/lib/supabase/teams", () => ({
  loadTeamLibrary: mocks.loadLibrary,
  saveTeamToLibrary: vi.fn(),
  updateTeamInLibrary: vi.fn(),
  deleteTeamFromLibrary: vi.fn()
}));

vi.mock("@/features/teams/TeamEditorDialog", () => ({ TeamEditorDialog: () => null }));

const profile: AppProfile = {
  id: "user-1",
  email: "trainer@example.com",
  username: "Trainer",
  isLocal: false
};

const popularTeam: SavedTeam = {
  id: "popular-1",
  ownerId: "admin-1",
  name: "Rain team",
  source: "Regional",
  pasteText: "",
  teamHash: "a".repeat(32),
  createdAt: "2026-09-22T00:00:00Z",
  updatedAt: "2026-09-22T00:00:00Z",
  team: { format: "champions", members: [] }
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadLibrary.mockResolvedValue({ own: [], opponent: [] });
  mocks.search.mockResolvedValue({ teams: [popularTeam], hasMore: false });
});

describe("profile popular-team library", () => {
  it("lets regular users search and view popular teams without showing write controls", async () => {
    mocks.canManage.mockResolvedValue(false);
    render(<ProfilePage profile={profile} onProfileUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Popular teams" }));

    expect(await screen.findByRole("button", { name: /Rain team.*Regional/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Rain team" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit team" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete team" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Name or source" }), { target: { value: "Regional" } });
    await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith({ text: "Regional", pokemon: "" }));
  });

  it("shows the popular import destination and edit controls to the administrator", async () => {
    mocks.canManage.mockResolvedValue(true);
    render(<ProfilePage profile={{ ...profile, email: "miguel20052002@gmail.com" }} onProfileUpdated={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Popular teams" })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Popular teams" })[1]);
    expect(await screen.findByRole("heading", { name: "Rain team" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit team" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete team" })).toBeVisible();
  });
});
