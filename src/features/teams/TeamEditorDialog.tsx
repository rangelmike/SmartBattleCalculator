import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Plus, Save, Trash2, X } from "lucide-react";
import {
  championsItems,
  championsNatures,
  championsSpecies,
  createChampionsMember,
  getChampionsItemIconUrl,
  getNatureModifiers,
  loadChampionsPokemonRules,
  validateChampionsTeam,
  type ChampionsPokemonRules
} from "@/lib/pokemon/champions-data";
import type { SavedTeam, TeamListKind } from "@/lib/pokemon/team-import";
import { getPokemonSpriteUrl, pokemonStatIds } from "@/lib/pokemon/team-stats";
import type { PokemonStatId, PokemonTeam, TeamMember } from "@/lib/pokemon/types";

const newSourceValue = "__new_source__";
const statLabels: Record<PokemonStatId, string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed"
};

export type TeamEditorDestination = TeamListKind | "popular";

export type TeamEditorSubmission = {
  name: string;
  source: string;
  destination: TeamEditorDestination;
  team: PokemonTeam;
};

type TeamEditorDialogProps = {
  open: boolean;
  initialTeam: SavedTeam | null;
  sources: string[];
  defaultDestination: TeamEditorDestination;
  canManagePopular: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (submission: TeamEditorSubmission) => Promise<void>;
};

export function TeamEditorDialog({
  open,
  initialTeam,
  sources,
  defaultDestination,
  canManagePopular,
  onOpenChange,
  onSave
}: TeamEditorDialogProps) {
  const [name, setName] = useState("");
  const [sourceChoice, setSourceChoice] = useState(newSourceValue);
  const [newSource, setNewSource] = useState("");
  const [destination, setDestination] = useState<TeamEditorDestination>(defaultDestination);
  const [team, setTeam] = useState<PokemonTeam>({ format: "champions", members: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initialSource = initialTeam?.source ?? "";
    setName(initialTeam?.name ?? "");
    setSourceChoice(initialSource && sources.includes(initialSource) ? initialSource : newSourceValue);
    setNewSource(initialSource && !sources.includes(initialSource) ? initialSource : "");
    setDestination(defaultDestination);
    setTeam(initialTeam ? cloneTeam(initialTeam.team) : { format: "champions", members: [] });
    setSelectedIndex(0);
    setSubmitError(null);
  }, [defaultDestination, initialTeam, open, sources]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsValidating(true);
    void validateChampionsTeam(team).then((result) => {
      if (active) {
        setValidationErrors(result.errors);
        setIsValidating(false);
      }
    });
    return () => {
      active = false;
    };
  }, [open, team]);

  const source = sourceChoice === newSourceValue ? newSource.trim() : sourceChoice;
  const canSave = Boolean(name.trim() && source && !isValidating && validationErrors.length === 0 && !isSaving);
  const selectedMember = team.members[selectedIndex] ?? null;

  function replaceMember(index: number, member: TeamMember) {
    setTeam((current) => ({
      ...current,
      members: current.members.map((value, memberIndex) => (memberIndex === index ? member : value))
    }));
  }

  async function addMember() {
    if (team.members.length >= 6) return;
    const member = await createChampionsMember(championsSpecies[0]);
    setTeam((current) => ({ ...current, members: [...current.members, member] }));
    setSelectedIndex(team.members.length);
  }

  function removeMember(index: number) {
    setTeam((current) => ({ ...current, members: current.members.filter((_, memberIndex) => memberIndex !== index) }));
    setSelectedIndex((current) => Math.max(0, Math.min(current, team.members.length - 2)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const result = await validateChampionsTeam(team);
    if (!result.ok) {
      setValidationErrors(result.errors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), source, destination, team: { ...team, format: "champions" } });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save the team.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/45" />
        <Dialog.Content className="fixed inset-x-3 top-3 z-50 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-lg border border-border bg-background shadow-xl sm:inset-x-6 lg:left-1/2 lg:right-auto lg:w-[min(1120px,calc(100vw-3rem))] lg:-translate-x-1/2">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-4 py-4 sm:px-6">
              <div>
                <Dialog.Title className="text-lg font-semibold">{initialTeam ? "Edit team" : "Create team"}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  Pokemon Champions format · fixed level 50
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary" type="button" aria-label="Close editor">
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </header>

            <div className="grid gap-6 px-4 py-5 sm:px-6">
              <section className="grid gap-4 md:grid-cols-3">
                <EditorField label="Team name">
                  <input className={inputClassName} value={name} onChange={(event) => setName(event.target.value)} required />
                </EditorField>
                <EditorField label="Source">
                  <select className={inputClassName} value={sourceChoice} onChange={(event) => setSourceChoice(event.target.value)}>
                    {sources.map((value) => <option key={value} value={value}>{value}</option>)}
                    <option value={newSourceValue}>New source...</option>
                  </select>
                </EditorField>
                {sourceChoice === newSourceValue ? (
                  <EditorField label="New source">
                    <input className={inputClassName} value={newSource} onChange={(event) => setNewSource(event.target.value)} required />
                  </EditorField>
                ) : !initialTeam ? (
                  <EditorField label="Collection">
                    <select className={inputClassName} value={destination} onChange={(event) => setDestination(event.target.value as TeamEditorDestination)}>
                      <option value="own">My teams</option>
                      <option value="opponent">Opponent teams</option>
                      {canManagePopular ? <option value="popular">Popular teams</option> : null}
                    </select>
                  </EditorField>
                ) : <div />}
              </section>

              {!initialTeam && sourceChoice === newSourceValue ? (
                <EditorField label="Collection" className="md:max-w-sm">
                  <select className={inputClassName} value={destination} onChange={(event) => setDestination(event.target.value as TeamEditorDestination)}>
                    <option value="own">My teams</option>
                    <option value="opponent">Opponent teams</option>
                    {canManagePopular ? <option value="popular">Popular teams</option> : null}
                  </select>
                </EditorField>
              ) : null}

              <section className="border-t border-border pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">Team members</h3>
                    <p className="text-sm text-muted-foreground">{team.members.length}/6 Pokemon selected</p>
                  </div>
                  <button className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-secondary disabled:opacity-50" type="button" onClick={() => void addMember()} disabled={team.members.length >= 6}>
                    <Plus aria-hidden className="h-4 w-4" /> Add Pokemon
                  </button>
                </div>

                {team.members.length ? (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Team members">
                    {team.members.map((member, index) => (
                      <button key={`${member.species}-${index}`} className={`flex h-16 min-w-32 items-center gap-2 rounded-md border px-2 text-left ${selectedIndex === index ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary"}`} type="button" onClick={() => setSelectedIndex(index)} role="tab" aria-selected={selectedIndex === index}>
                        <img className="h-11 w-11 shrink-0 object-contain" src={getPokemonSpriteUrl(member.species)} alt="" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                        <span className="min-w-0 truncate text-xs font-semibold">{member.species}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button className="mt-4 flex min-h-32 w-full items-center justify-center rounded-md border border-dashed border-border text-sm font-semibold text-muted-foreground hover:bg-secondary" type="button" onClick={() => void addMember()}>
                    <Plus aria-hidden className="mr-2 h-4 w-4" /> Add your first Pokemon
                  </button>
                )}
              </section>

              {selectedMember ? (
                <PokemonEditor
                  key={`${selectedIndex}-${selectedMember.species}`}
                  member={selectedMember}
                  onChange={(member) => replaceMember(selectedIndex, member)}
                  onRemove={() => removeMember(selectedIndex)}
                />
              ) : null}

              {(submitError || validationErrors.length > 0) ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                  <div className="flex items-center gap-2 font-semibold"><AlertCircle aria-hidden className="h-4 w-4" /> Check the team</div>
                  {submitError ? <p className="mt-2">{submitError}</p> : null}
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationErrors.slice(0, 6).map((message) => <li key={message}>{message}</li>)}
                  </ul>
                  {validationErrors.length > 6 ? <p className="mt-2">And {validationErrors.length - 6} more errors.</p> : null}
                </div>
              ) : null}
            </div>

            <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-4 sm:px-6">
              <p className="text-xs text-muted-foreground">{isValidating ? "Validating..." : validationErrors.length ? "The team is not valid yet" : "Team valid for Champions"}</p>
              <button className="flex h-11 min-w-40 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!canSave}>
                <Save aria-hidden className="h-4 w-4" /> {isSaving ? "Saving..." : "Save team"}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PokemonEditor({ member, onChange, onRemove }: { member: TeamMember; onChange: (member: TeamMember) => void; onRemove: () => void }) {
  const [rules, setRules] = useState<ChampionsPokemonRules | null>(null);
  const [isChangingSpecies, setIsChangingSpecies] = useState(false);
  const natureModifiers = getNatureModifiers(member.nature);
  const evTotal = useMemo(() => Object.values(member.evs).reduce((total, value) => total + (value ?? 0), 0), [member.evs]);

  useEffect(() => {
    let active = true;
    void loadChampionsPokemonRules(member.species).then((nextRules) => {
      if (active) setRules(nextRules);
    });
    return () => { active = false; };
  }, [member.species]);

  async function changeSpecies(species: string) {
    setIsChangingSpecies(true);
    try {
      onChange(await createChampionsMember(species));
    } finally {
      setIsChangingSpecies(false);
    }
  }

  function changeMove(index: number, move: string) {
    const moves = Array.from({ length: 4 }, (_, moveIndex) => member.moves[moveIndex] ?? "");
    moves[index] = move;
    onChange({ ...member, moves: moves.filter(Boolean) });
  }

  function changeEv(stat: PokemonStatId, value: string) {
    const nextValue = Math.max(0, Math.min(32, Number(value) || 0));
    onChange({ ...member, evs: { ...member.evs, [stat]: nextValue } });
  }

  return (
    <section className="border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-muted">
            <img className="max-h-20 max-w-20 object-contain" src={getPokemonSpriteUrl(member.species)} alt={member.species} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{member.species}</h3>
            <p className="text-sm text-muted-foreground">Level 50</p>
          </div>
        </div>
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10" type="button" onClick={onRemove} title="Remove Pokemon" aria-label="Remove Pokemon">
          <Trash2 aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EditorField label="Pokemon" className="lg:col-span-2">
          <select className={inputClassName} value={member.species} onChange={(event) => void changeSpecies(event.target.value)} disabled={isChangingSpecies}>
            {championsSpecies.map((species) => <option key={species} value={species}>{species}</option>)}
          </select>
        </EditorField>
        <EditorField label="Ability">
          <select className={inputClassName} value={member.ability ?? ""} onChange={(event) => onChange({ ...member, ability: event.target.value })}>
            <option value="">Select...</option>
            {rules?.abilities.map((ability) => <option key={ability} value={ability}>{ability}</option>)}
          </select>
        </EditorField>
        <EditorField label="Item">
          <div className="flex gap-2">
            <select className={inputClassName} value={member.item ?? ""} onChange={(event) => onChange({ ...member, item: event.target.value || undefined })}>
              <option value="">Select...</option>
              {championsItems.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            {member.item ? <img className="h-10 w-10 shrink-0 object-contain" src={getChampionsItemIconUrl(member.item)} alt="" /> : null}
          </div>
        </EditorField>
        <EditorField label="Nature">
          <select className={inputClassName} value={member.nature ?? "Serious"} onChange={(event) => onChange({ ...member, nature: event.target.value as TeamMember["nature"] })}>
            {championsNatures.map((nature) => <option key={nature} value={nature}>{nature}</option>)}
          </select>
        </EditorField>
        {Array.from({ length: 4 }, (_, index) => (
          <EditorField key={index} label={`Move ${index + 1}`}>
            <select className={inputClassName} value={member.moves[index] ?? ""} onChange={(event) => changeMove(index, event.target.value)}>
              <option value="">No move</option>
              {rules?.moves.map((move) => <option key={move} value={move}>{move}</option>)}
            </select>
          </EditorField>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">EV distribution</h4>
          <span className={`text-sm font-semibold tabular-nums ${evTotal > 66 ? "text-destructive" : "text-muted-foreground"}`}>{evTotal}/66</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {pokemonStatIds.map((stat) => (
            <EditorField key={stat} label={statLabels[stat]} labelClassName={natureModifiers.plus === stat ? "text-emerald-600" : natureModifiers.minus === stat ? "text-red-600" : ""}>
              <input className={`${inputClassName} tabular-nums`} type="number" min={0} max={32} step={1} value={member.evs[stat] ?? 0} onChange={(event) => changeEv(stat, event.target.value)} />
            </EditorField>
          ))}
        </div>
      </div>
    </section>
  );
}

const inputClassName = "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-60";

function EditorField({ label, className = "", labelClassName = "", children }: { label: string; className?: string; labelClassName?: string; children: React.ReactNode }) {
  return <label className={`grid min-w-0 gap-2 text-sm font-medium ${className}`}><span className={labelClassName}>{label}</span>{children}</label>;
}

function cloneTeam(team: PokemonTeam): PokemonTeam {
  return {
    ...team,
    format: "champions",
    members: team.members.map((member) => ({
      ...member,
      level: 50,
      evs: { ...member.evs },
      ivs: { ...member.ivs },
      moves: [...member.moves]
    }))
  };
}
