import * as Dialog from "@radix-ui/react-dialog";
import { toID } from "@smogon/calc";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { FilterAutocomplete } from "@/features/teams/FilterAutocomplete";
import { championsSpecies } from "@/lib/pokemon/champions-data";
import type { BattleSide } from "@/lib/pokemon/damage-calculation";
import type { SavedTeam, TeamLibrary } from "@/lib/pokemon/team-import";
import { completePokemonTerm, filterTeams, getPokemonSuggestionContext, getPokemonSuggestions, getSourceSuggestions, type TeamSearchSuggestion } from "@/lib/pokemon/team-search";
import { getPokemonSpriteUrl } from "@/lib/pokemon/team-stats";
import { searchPopularTeams, suggestPopularPokemon, suggestPopularSources } from "@/lib/supabase/popular-teams";
import { describeServiceError } from "@/lib/supabase/service-error";

type Props = {
  open: boolean;
  side: BattleSide;
  library: TeamLibrary;
  onClose: () => void;
  onSelect: (team: SavedTeam) => void;
  onAddPokemon: (species: string[]) => Promise<void>;
  isAdding: boolean;
};

const speciesById = new Map(championsSpecies.map((species) => [toID(species), species]));

export function CalculatorTeamPicker({ open, side, library, onClose, onSelect, onAddPokemon, isAdding }: Props) {
  const [collection, setCollection] = useState<"personal" | "popular">("personal");
  const [text, setText] = useState("");
  const [pokemon, setPokemon] = useState("");
  const [popularTeams, setPopularTeams] = useState<SavedTeam[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const personalTeams = side === "own" ? library.own : library.opponent;
  const searchTerms = pokemon.split(",").map((term) => term.trim());
  const pokemonTerms = searchTerms.filter(Boolean);
  const matchedSpecies = pokemonTerms.map((term) => speciesById.get(toID(term)));
  const canAddSearched = pokemonTerms.length > 0 && pokemonTerms.length <= 6 && searchTerms.every(Boolean) && matchedSpecies.every(Boolean);

  async function addSearchedPokemon() {
    if (!canAddSearched || isAdding) return;
    setError(null);
    try {
      await onAddPokemon([...new Set(matchedSpecies.flatMap((species) => species ? [species] : []))]);
      onClose();
    } catch (cause) {
      setError(describeServiceError(cause, "Could not add Pokemon."));
    }
  }

  useEffect(() => {
    if (open) {
      setCollection("personal");
      setText("");
      setPokemon("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || collection !== "popular" || side !== "opponent") return;
    const current = ++request.current;
    setIsLoading(true);
    setError(null);
    setPopularTeams([]);
    setHasMore(false);
    const timer = window.setTimeout(() => {
      void searchPopularTeams({ text, pokemon }).then((result) => {
        if (current !== request.current) return;
        setPopularTeams(result.teams);
        setHasMore(result.hasMore);
      }).catch((cause) => {
        if (current === request.current) setError(describeServiceError(cause, "Could not load popular teams."));
      }).finally(() => {
        if (current === request.current) setIsLoading(false);
      });
    }, text || pokemon ? 250 : 0);
    return () => { window.clearTimeout(timer); request.current += 1; };
  }, [open, collection, side, text, pokemon]);

  const teams = useMemo(() => collection === "popular"
    ? popularTeams
    : filterTeams(personalTeams, { text, pokemon }), [collection, personalTeams, pokemon, popularTeams, text]);

  async function loadMore() {
    if (!hasMore || isLoading) return;
    const current = request.current;
    setIsLoading(true);
    try {
      const result = await searchPopularTeams({ text, pokemon }, popularTeams.length);
      if (current !== request.current) return;
      setPopularTeams((previous) => [...previous, ...result.teams]);
      setHasMore(result.hasMore);
    } catch (cause) {
      if (current === request.current) setError(describeServiceError(cause, "Could not load more teams."));
    } finally {
      if (current === request.current) setIsLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/50" />
        <Dialog.Content className="fixed inset-x-3 top-[5vh] z-50 mx-auto flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-md border border-border bg-background shadow-xl">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Select {side === "own" ? "My Team" : "Opponent Team"}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Choose a saved team.</Dialog.Description>
            </div>
            <Dialog.Close asChild><button className="rounded p-1 hover:bg-secondary" type="button" aria-label="Close team picker"><X className="h-5 w-5" /></button></Dialog.Close>
          </div>
          {side === "opponent" ? (
            <div className="flex gap-1 border-b border-border px-5 pt-3" role="tablist" aria-label="Team collections">
              <button className={tabClass(collection === "personal")} type="button" role="tab" aria-selected={collection === "personal"} onClick={() => setCollection("personal")}>Opponent teams</button>
              <button className={tabClass(collection === "popular")} type="button" role="tab" aria-selected={collection === "popular"} onClick={() => setCollection("popular")}>Popular teams</button>
            </div>
          ) : null}
          <div className="grid gap-3 border-b border-border px-5 py-4 sm:grid-cols-2">
            <FilterAutocomplete
              label="Name or source" value={text} onChange={setText} placeholder="Search teams or sources"
              getSuggestions={collection === "popular" ? undefined : (value) => getSourceSuggestions(personalTeams, value)}
              loadSuggestions={collection === "popular" ? suggestPopularSources : undefined}
              complete={(_value, _caret, suggestion) => ({ value: suggestion, caret: suggestion.length })}
            />
            <FilterAutocomplete
              label="Included Pokemon" value={pokemon} onChange={setPokemon} placeholder="Pelipper, Archaludon"
              getSuggestions={collection === "popular" ? undefined : (value, caret) => withChampionsSuggestions(getPokemonSuggestions(personalTeams, value, caret), value, caret)}
              loadSuggestions={collection === "popular" ? async (value, caret) => withChampionsSuggestions(await suggestPopularPokemon(value, caret), value, caret) : undefined}
              complete={(value, caret, suggestion) => completePokemonTerm(value, suggestion, caret)}
            />
            {pokemon.trim() ? (
              <div className="flex justify-end sm:col-span-2">
                <button className="flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" type="button" disabled={!canAddSearched || isAdding} title={canAddSearched ? "Add these Pokemon to the calculator" : "Complete up to six Pokemon names first"} onClick={() => void addSearchedPokemon()}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> {isAdding ? "Adding..." : "Add searched Pokemon"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="min-h-40 overflow-y-auto px-5 py-4">
            {error ? <p className="mb-3 text-sm text-destructive" role="alert">{error}</p> : null}
            {isLoading && teams.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Loading teams...</p> : null}
            {!isLoading && teams.length === 0 && !error ? <p className="py-8 text-center text-sm text-muted-foreground">No teams match your search.</p> : null}
            <div className="grid gap-2">
              {teams.map((team) => (
                <button key={team.id} className="flex min-w-0 items-center gap-3 rounded-md border border-border p-3 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-50" type="button" disabled={isAdding} onClick={() => { onSelect(team); onClose(); }}>
                  <span className="flex w-20 shrink-0 items-center -space-x-2" aria-hidden="true">
                    {team.team.members.slice(0, 3).map((member, index) => <img key={`${member.species}-${index}`} className="h-9 w-9 object-contain" src={getPokemonSpriteUrl(member.species)} alt="" />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{team.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{team.source} · {team.team.members.map((member) => member.species).join(", ")}</span>
                  </span>
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
            {collection === "popular" && hasMore ? <button className="mt-3 h-10 w-full rounded-md border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50" type="button" disabled={isLoading} onClick={() => void loadMore()}>{isLoading ? "Loading..." : "Load more"}</button> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function tabClass(active: boolean) {
  return `border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`;
}

function withChampionsSuggestions(ranked: TeamSearchSuggestion[], query: string, caret: number) {
  const { prefix, excluded } = getPokemonSuggestionContext(query, caret);
  const prefixId = toID(prefix);
  if (!prefixId) return ranked;
  const seen = new Set([...ranked.map((item) => toID(item.name)), ...excluded.map(toID)]);
  const fallback = championsSpecies
    .filter((species) => {
      const id = toID(species);
      return id.startsWith(prefixId) && id !== prefixId && !seen.has(id);
    })
    .map((name) => ({ name, teamCount: 0 }));
  return [...ranked, ...fallback].slice(0, 6);
}
