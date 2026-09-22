import type { SavedTeam, TeamLibrary } from "@/lib/pokemon/team-import";

export type TeamSearchFilters = {
  text: string;
  pokemon: string;
};

export type TeamSearchSuggestion = { name: string; teamCount: number };

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

  return [...sources.values()].sort((left, right) => left.localeCompare(right, "en"));
}

export function getSourceSuggestions(teams: SavedTeam[], query: string, limit = 6): TeamSearchSuggestion[] {
  const prefix = normalize(query);
  if (!prefix) return [];
  return rankSuggestions(teams.flatMap((team) => team.source.trim() ? [team.source.trim()] : []), prefix, new Set(), limit);
}

export function getPokemonSuggestions(
  teams: SavedTeam[],
  query: string,
  caret = query.length,
  limit = 6
): TeamSearchSuggestion[] {
  const context = getPokemonSuggestionContext(query, caret);
  const prefix = normalize(context.prefix);
  if (!prefix) return [];

  const selected = new Set(context.excluded.map(normalize));
  const names = teams.flatMap((team) => [...new Set(team.team.members.map((member) => member.species))]);
  return rankSuggestions(names, prefix, selected, limit);
}

export function getPokemonSuggestionContext(query: string, caret = query.length) {
  const { start, end } = pokemonTermBounds(query, caret);
  const excluded = query
    .split(",")
    .map((part, index, parts) => {
      const offset = parts.slice(0, index).reduce((sum, value) => sum + value.length + 1, 0);
      return offset >= start && offset < end ? "" : part.trim();
    })
    .filter(Boolean);
  return { prefix: query.slice(start, caret).trim(), excluded };
}

export function completePokemonTerm(query: string, species: string, caret = query.length) {
  const { start, end } = pokemonTermBounds(query, caret);
  const before = query.slice(0, start).trimEnd();
  const after = query.slice(end).trimStart();
  const value = `${before}${before ? " " : ""}${species}${after}`;
  return { value, caret: before.length + (before ? 1 : 0) + species.length };
}

function pokemonTermBounds(query: string, caret: number) {
  const position = Math.max(0, Math.min(caret, query.length));
  const start = query.lastIndexOf(",", Math.max(0, position - 1)) + 1;
  const nextComma = query.indexOf(",", position);
  return { start, end: nextComma === -1 ? query.length : nextComma };
}

function rankSuggestions(values: string[], prefix: string, excluded: Set<string>, limit: number) {
  const counts = new Map<string, TeamSearchSuggestion>();
  for (const name of values) {
    const key = normalize(name);
    if (!key.startsWith(prefix) || key === prefix || excluded.has(key)) continue;
    const current = counts.get(key);
    counts.set(key, { name: current?.name ?? name, teamCount: (current?.teamCount ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((left, right) => right.teamCount - left.teamCount || left.name.localeCompare(right.name, "en"))
    .slice(0, limit);
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
