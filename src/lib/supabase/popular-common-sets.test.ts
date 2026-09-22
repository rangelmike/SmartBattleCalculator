import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { from: mocks.from } }));

import { getPopularPokemonCommonSet } from "@/lib/supabase/popular-common-sets";

beforeEach(() => vi.clearAllMocks());

describe("popular Pokemon common sets", () => {
  it("reads one stored species summary without loading popular teams", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        species: "Pelipper",
        sample_size: 12,
        moves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"],
        item: "Sitrus Berry",
        ability: "Drizzle",
        evs: { hp: 32, atk: 0, def: 1, spa: 5, spd: 17, spe: 11 },
        nature: "Modest",
        updated_at: "2026-09-22T00:00:00Z"
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const result = await getPopularPokemonCommonSet("Pelipper");

    expect(mocks.from).toHaveBeenCalledWith("popular_pokemon_common_sets");
    expect(eq).toHaveBeenCalledWith("species", "Pelipper");
    expect(result).toMatchObject({ species: "Pelipper", sampleSize: 12, moves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"], evs: { hp: 32 } });
  });

  it("returns null when the species has no popular usage", async () => {
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) });
    expect(await getPopularPokemonCommonSet("Unknown")).toBeNull();
  });
});
