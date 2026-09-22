import type { SavedTeam, TeamLibrary } from "@/lib/pokemon/team-import";

export type TeamSearchFilters = {
  text: string;
  pokemon: string;
};

export function filterTeams(teams: SavedTeam[], filters: TeamSearchFilters) {
  const text = normalize(filters.text);
  const pokemonTerms = filters.pokemon
    .split(",")
    .map(normalize)
    .filter(Boolean);

  return teams.filter((team) => {
    const matchesText = !text || normalize(`${team.name} ${team.source}`).includes(text);
    const memberNames = team.team.members.map((member) => normalize(`${member.name} ${member.species}`));
    const matchesPokemon = pokemonTerms.every((term) => memberNames.some((name) => name.includes(term)));

    return matchesText && matchesPokemon;
  });
}

export function getTeamSources(library: TeamLibrary) {
  const sources = new Map<string, string>();

  for (const team of [...library.own, ...library.opponent]) {
    const source = team.source.trim();
    const key = normalize(source);

    if (source && !sources.has(key)) {
      sources.set(key, source);
    }
  }

  return [...sources.values()].sort((left, right) => left.localeCompare(right, "es"));
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
