import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTeamLibrary } from "@/lib/supabase/teams";

const mock = vi.hoisted(() => ({
  teams: [] as Record<string, unknown>[],
  collections: [] as Record<string, unknown>[],
  ranges: [] as { table: string; start: number; end: number }[],
  failAt: -1
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from(table: string) {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range(start: number, end: number) {
          mock.ranges.push({ table, start, end });
          if (start === mock.failAt) return Promise.resolve({ data: null, error: new Error("page failed") });
          const rows = table === "teams" ? mock.teams : mock.collections;
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null });
        }
      };
      return query;
    }
  }
}));

beforeEach(() => {
  mock.teams = Array.from({ length: 1001 }, (_, index) => ({
    id: `team-${index}`, user_id: "trainer", name: `Team ${index}`, source: "Test",
    paste_url: null, paste_text: "", team_json: { format: "champions", members: [] },
    team_hash: `hash-${index}`, created_at: "2026-01-01", updated_at: "2026-01-01"
  }));
  mock.collections = mock.teams.flatMap((team) => [
    { team_id: team.id, list_kind: "own" },
    { team_id: team.id, list_kind: "opponent" }
  ]);
  mock.ranges = [];
  mock.failAt = -1;
});

describe("team library pagination", () => {
  it("loads more than the Supabase 1000-row response limit without losing collections", async () => {
    const library = await loadTeamLibrary("trainer");
    expect(library.own).toHaveLength(1001);
    expect(library.opponent).toHaveLength(1001);
    expect(mock.ranges.filter((range) => range.table === "teams")).toHaveLength(6);
    expect(mock.ranges.filter((range) => range.table === "team_collections")).toHaveLength(11);
    expect(mock.ranges.every((range) => range.end - range.start === 199)).toBe(true);
  });

  it("rejects on a failed page instead of returning a partial library", async () => {
    mock.failAt = 200;
    await expect(loadTeamLibrary("trainer")).rejects.toThrow("page failed");
  });
});
