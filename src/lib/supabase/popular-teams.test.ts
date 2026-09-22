import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import type { PopularTeamRow } from "@/lib/supabase/database.types";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), validate: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock("@/lib/pokemon/champions-data", () => ({ assertValidChampionsTeam: mocks.validate }));

import {
  canManagePopularTeams,
  createPopularTeam,
  deletePopularTeam,
  popularTeamPageSize,
  searchPopularTeams,
  suggestPopularPokemon,
  updatePopularTeam
} from "@/lib/supabase/popular-teams";

const team: SavedTeam = {
  id: "team-1",
  ownerId: "admin-1",
  name: "Rain",
  source: "Regional",
  pasteText: "paste",
  teamHash: "hash-that-is-at-least-thirty-two-characters",
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
  team: {
    format: "champions",
    members: [{ name: "Pelipper", species: "Pelipper", level: 50, evs: {}, ivs: {}, moves: ["Protect"] }]
  }
};

function row(index: number): PopularTeamRow {
  return {
    id: `team-${index}`,
    created_by: "admin-1",
    name: `Team ${index}`,
    source: "Regional",
    format: "champions",
    paste_url: null,
    paste_text: "paste",
    team_json: team.team,
    team_hash: `hash-${index}`,
    species_names: ["Pelipper"],
    created_at: team.createdAt,
    updated_at: team.updatedAt
  };
}

beforeEach(() => vi.clearAllMocks());

describe("popular team access", () => {
  it("uses the database administrator check", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    expect(await canManagePopularTeams()).toBe(false);
    expect(await canManagePopularTeams()).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("is_popular_team_admin");
  });

  it("requests only one bounded page with all active filters", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: Array.from({ length: 21 }, (_, index) => row(index)), error: null });
    const result = await searchPopularTeams({ text: " Rain ", pokemon: "Pelipper, Archaludon" }, 40);
    expect(mocks.rpc).toHaveBeenCalledWith("search_popular_teams", {
      p_text: "Rain",
      p_pokemon: ["Pelipper", "Archaludon"],
      p_limit: popularTeamPageSize + 1,
      p_offset: 40
    });
    expect(result.teams).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.teams[0].team.members[0].species).toBe("Pelipper");
  });

  it("sends the active Pokemon prefix and completed terms to global autocomplete", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ name: "Archaludon", team_count: 12 }], error: null });
    expect(await suggestPopularPokemon("Pelipper, Arch", 14)).toEqual([{ name: "Archaludon", teamCount: 12 }]);
    expect(mocks.rpc).toHaveBeenCalledWith("suggest_popular_teams", {
      p_kind: "pokemon", p_prefix: "Arch", p_excluded: ["Pelipper"]
    });
  });

  it("validates a global import and records its searchable species", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert });
    await createPopularTeam(team);
    expect(mocks.validate).toHaveBeenCalledWith(team.team);
    expect(mocks.from).toHaveBeenCalledWith("popular_teams");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      created_by: "admin-1", species_names: ["Pelipper"], team_hash: team.teamHash
    }));
  });

  it("does not claim success when RLS hides an update or delete", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    mocks.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }), delete: vi.fn().mockReturnValue({ eq }) });
    await expect(updatePopularTeam(team)).rejects.toThrow(/permission/i);
    await expect(deletePopularTeam(team.id)).rejects.toThrow(/permission/i);
  });
});
