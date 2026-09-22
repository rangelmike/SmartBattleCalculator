import { useEffect, useState } from "react";
import { CircleHelp, Pencil, Sparkles, Sword, Trash2 } from "lucide-react";
import { getChampionsItemIconUrl, getNatureModifiers } from "@/lib/pokemon/champions-data";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import {
  calculateLevel50Stats,
  getChampionsMegaSpecies,
  getChampionsMoveDetails,
  getPokemonSpriteUrl,
  pokemonStatIds,
  type Level50Stats
} from "@/lib/pokemon/team-stats";
import type { TeamMember } from "@/lib/pokemon/types";

type TeamViewerProps = {
  team: SavedTeam | null;
  isDeleting?: boolean;
  onEdit?: (team: SavedTeam) => void;
  onDelete?: (team: SavedTeam) => Promise<void>;
};

const statLabels: Record<(typeof pokemonStatIds)[number], string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed"
};

export function TeamViewer({ team, isDeleting = false, onEdit, onDelete }: TeamViewerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setConfirmDelete(false), [team?.id]);

  if (!team) {
    return (
      <section className="flex min-h-80 items-center justify-center border-t border-border py-12 lg:border-l lg:border-t-0 lg:pl-8">
        <div className="max-w-sm text-center text-muted-foreground">
          <CircleHelp aria-hidden className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">Select a team to see its details.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Team overview</p>
          <h2 className="text-xl font-semibold">{team.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{team.source}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
            {team.team.members.length}/6 Pokemon
          </span>
          {onEdit ? (
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-secondary" type="button" onClick={() => onEdit(team)} title="Edit team" aria-label="Edit team">
              <Pencil aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10" type="button" onClick={() => setConfirmDelete(true)} title="Delete team" aria-label="Delete team">
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {confirmDelete && onDelete ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">Delete {team.name} from all collections?</p>
          <div className="flex gap-2">
            <button className="h-9 rounded-md border border-border px-3 text-sm font-semibold hover:bg-background" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="h-9 rounded-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60" type="button" disabled={isDeleting} onClick={() => void onDelete(team).then(() => setConfirmDelete(false)).catch(() => undefined)}>{isDeleting ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {team.team.members.map((member, index) => (
          <PokemonCard key={`${team.id}-${index}-${member.species}-${member.item}`} member={member} isChampions={team.team.format === "champions"} />
        ))}
      </div>
    </section>
  );
}

function PokemonCard({ member, isChampions }: { member: TeamMember; isChampions: boolean }) {
  const [showMega, setShowMega] = useState(false);
  const megaSpecies = isChampions ? getChampionsMegaSpecies(member) : null;
  const displaySpecies = showMega && megaSpecies ? megaSpecies : member.species;
  const spriteUrl = getPokemonSpriteUrl(displaySpecies);
  const natureModifiers = getNatureModifiers(member.nature);
  let stats: Level50Stats | null = null;
  let model: "champions" | "standard" = "standard";

  try {
    const calculated = calculateLevel50Stats(member, {
      species: displaySpecies,
      model: isChampions ? "champions" : undefined
    });
    stats = calculated.stats;
    model = calculated.model;
  } catch {
    stats = null;
  }

  return (
    <article className="relative rounded-lg border border-border bg-card hover:z-10 focus-within:z-10">
      <div className="flex min-h-28 items-center gap-3 rounded-t-lg border-b border-border bg-muted/50 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center">
          {spriteUrl ? (
            <img className="h-20 w-20 object-contain" src={spriteUrl} alt={displaySpecies} loading="lazy" />
          ) : (
            <CircleHelp aria-hidden className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            {member.name === member.species ? displaySpecies : `${member.name} (${displaySpecies})`}
          </h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Level 50 · {model === "champions" ? "Champions" : "Standard"}
          </p>
          {megaSpecies ? (
            <div className="mt-2 inline-flex rounded-md border border-border bg-background p-0.5" aria-label={`${member.species} form`}>
              <button className={`h-7 rounded px-2 text-xs font-semibold ${!showMega ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`} type="button" aria-pressed={!showMega} onClick={() => setShowMega(false)}>
                Normal
              </button>
              <button className={`flex h-7 items-center gap-1 rounded px-2 text-xs font-semibold ${showMega ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`} type="button" aria-pressed={showMega} onClick={() => setShowMega(true)}>
                <img className="h-4 w-4 object-contain" src="https://play.pokemonshowdown.com/sprites/misc/mega.png" alt="" />
                Mega
              </button>
            </div>
          ) : null}
          <div className="mt-2 grid gap-1 text-xs text-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="truncate">{member.ability || "No ability"}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              {member.item ? <img className="h-5 w-5 shrink-0 object-contain" src={getChampionsItemIconUrl(member.item)} alt="" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : null}
              <span className="truncate">{member.item || "No item"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Sword aria-hidden className="h-3.5 w-3.5" />
            Moves
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {member.moves.map((move) => {
              const details = getChampionsMoveDetails(move);
              return (
                <li key={move} className="group relative rounded bg-secondary px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} aria-label={`${move}. Power: ${details?.power ?? "—"}. Accuracy: ${details?.accuracy ?? "—"}.`}>
                  {move}
                  <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-40 gap-3 rounded-md border border-border bg-foreground px-3 py-2 text-xs font-medium text-background shadow-lg group-hover:flex group-focus:flex">
                    <span>Power: {details?.power ?? "—"}</span>
                    <span>Accuracy: {details?.accuracy ?? "—"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Stats</p>
            <span className="text-xs font-semibold">{member.nature ?? "Serious"}</span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {pokemonStatIds.map((stat) => (
              <div key={stat} className={`border-b pb-1 ${natureModifiers.plus === stat ? "border-emerald-300 bg-emerald-50 text-emerald-700" : natureModifiers.minus === stat ? "border-red-300 bg-red-50 text-red-700" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <dt className={natureModifiers.plus === stat || natureModifiers.minus === stat ? "font-semibold" : "text-muted-foreground"}>
                    {statLabels[stat]} {natureModifiers.plus === stat ? "↑" : natureModifiers.minus === stat ? "↓" : ""}
                  </dt>
                  <dd className="font-semibold tabular-nums">{stats?.[stat] ?? "--"}</dd>
                </div>
                <p className="mt-0.5 text-[10px] tabular-nums opacity-80">EV {member.evs[stat] ?? 0}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}
