import { describe, expect, it, vi } from "vitest";
import {
  addTeamToLibrary,
  buildSavedTeamFromEditor,
  buildSavedTeam,
  loadPokepasteText,
  removeTeamFromLibrary,
  replaceTeamInLibrary,
  toPokePasteRawUrl,
  type TeamLibrary
} from "@/lib/pokemon/team-import";

const pasteText = `Grimmsnarl @ Light Clay
Ability: Prankster
Level: 50
EVs: 32 HP / 20 Def / 14 SpD
Calm Nature
- Foul Play
- Parting Shot
- Reflect
- Light Screen`;

const championsPasteText = `Grimmsnarl (M) @ Light Clay
Ability: Prankster
EVs: 32 HP / 20 Def / 14 SpD
Calm Nature
- Foul Play
- Parting Shot
- Reflect
- Light Screen

Swampert (M) @ Swampertite
Ability: Damp
EVs: 18 HP / 30 Atk / 18 Spe
Adamant Nature
- Wave Crash
- Earthquake
- Ice Punch
- Protect

Pelipper (M) @ Sitrus Berry
Ability: Drizzle
EVs: 32 HP / 1 Def / 5 SpA / 17 SpD / 11 Spe
Modest Nature
- Hurricane
- Weather Ball
- Tailwind
- Wide Guard

Archaludon (M) @ Leftovers
Ability: Stamina
EVs: 32 HP / 1 SpA / 29 SpD / 4 Spe
Modest Nature
- Electro Shot
- Dragon Pulse
- Flash Cannon
- Protect

Sinistcha @ Coba Berry
Ability: Hospitality
EVs: 32 HP / 4 Def / 30 SpD
Relaxed Nature
- Matcha Gotcha
- Rage Powder
- Trick Room
- Protect

Metagross @ Metagrossite
Ability: Clear Body
EVs: 14 HP / 27 Atk / 25 Spe
Jolly Nature
- Iron Head
- Psychic Fangs
- Body Press
- Protect`;

describe("team import", () => {
  it("builds a saved team from Showdown text", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Screens",
      source: "testing",
      pasteText,
      destination: "own"
    });

    expect(team.name).toBe("Screens");
    expect(team.source).toBe("testing");
    expect(team.team.members).toHaveLength(1);
    expect(team.team.members[0].species).toBe("Grimmsnarl");
    expect(team.teamHash).toHaveLength(64);
  });

  it("imports the provided Pokemon Champions Pokepaste", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Champions rain",
      source: "https://pokepast.es/9a8f5d768ac355da",
      pasteText: championsPasteText,
      pasteUrl: "https://pokepast.es/9a8f5d768ac355da",
      destination: "own"
    });

    expect(team.team.members.map((member) => member.species)).toEqual([
      "Grimmsnarl",
      "Swampert",
      "Pelipper",
      "Archaludon",
      "Sinistcha",
      "Metagross"
    ]);
    expect(team.team.members[0].evs).toMatchObject({ hp: 32, def: 20, spd: 14 });
    expect(team.team.members[5].item).toBe("Metagrossite");
    expect(team.team.members.every((member) => member.moves.length === 4)).toBe(true);
  });

  it("adds own teams to own and opponent lists", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Own team",
      source: "testing",
      pasteText,
      destination: "own"
    });
    const library: TeamLibrary = { own: [], opponent: [] };

    expect(addTeamToLibrary(library, team, "own")).toMatchObject({
      own: [{ teamHash: team.teamHash }],
      opponent: [{ teamHash: team.teamHash }]
    });
  });

  it("adds opponent teams only to opponent lists", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Opponent team",
      source: "testing",
      pasteText,
      destination: "opponent"
    });
    const library: TeamLibrary = { own: [], opponent: [] };
    const nextLibrary = addTeamToLibrary(library, team, "opponent");

    expect(nextLibrary.own).toHaveLength(0);
    expect(nextLibrary.opponent).toHaveLength(1);
  });

  it("loads Pokepaste raw text through the expected URL", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(pasteText))) as unknown as typeof fetch;

    await expect(loadPokepasteText("https://pokepast.es/abc123", fetcher)).resolves.toBe(pasteText);
    expect(vi.mocked(fetcher)).toHaveBeenCalledWith("https://pokepast.es/abc123/raw");
    expect(toPokePasteRawUrl("https://pokepast.es/abc123/")).toBe("https://pokepast.es/abc123/raw");
  });

  it("rejects invalid manually-created teams", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Screens",
      source: "testing",
      pasteText,
      destination: "own"
    });
    team.team.members[0].level = 49;

    await expect(buildSavedTeamFromEditor({
      ownerId: "user-1",
      name: "Invalid",
      source: "testing",
      destination: "own",
      team: team.team
    })).rejects.toThrow(/level 50/i);
  });

  it("updates and deletes the same team in every collection", async () => {
    const team = await buildSavedTeam({
      ownerId: "user-1",
      name: "Original",
      source: "testing",
      pasteText,
      destination: "own"
    });
    const library = addTeamToLibrary({ own: [], opponent: [] }, team, "own");
    const edited = { ...team, name: "Edited" };
    const updated = replaceTeamInLibrary(library, edited);

    expect(updated.own[0].name).toBe("Edited");
    expect(updated.opponent[0].name).toBe("Edited");
    expect(removeTeamFromLibrary(updated, team.id)).toEqual({ own: [], opponent: [] });
  });
});
