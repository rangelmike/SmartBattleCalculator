import { useEffect, useState } from "react";
import { toID } from "@smogon/calc";
import { Pencil, Plus, RotateCcw, Save, Trash2, UserX, Users } from "lucide-react";
import { getBoostedStat } from "@/lib/pokemon/battle-boosts";
import {
  championsItems,
  championsNatures,
  championsSpecies,
  getChampionsItemIconUrl,
  getNatureModifiers,
  getNatureForStats,
  getNatureOptionLabel,
  getNatureStatPair,
  loadChampionsPokemonRules,
  natureStatIds,
  type ChampionsPokemonRules
} from "@/lib/pokemon/champions-data";
import {
  getChampionsFormes,
  getChampionsTypes,
  getFormeDefaultAbility,
  getMaxHp,
  getMoveInfo,
  getPokemonTypes,
  type BattlePokemon,
  type BattleSide,
  type BoostableStat
} from "@/lib/pokemon/damage-calculation";
import { calculateLevel50Stats, getPokemonSpriteUrl, pokemonStatIds } from "@/lib/pokemon/team-stats";
import type { PokemonStatId, TeamMember } from "@/lib/pokemon/types";
import type { CalculatorRoster } from "@/lib/pokemon/calculator-session";

const statLabels: Record<PokemonStatId, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe"
};

type Props = {
  side: BattleSide;
  roster: CalculatorRoster;
  selected: BattlePokemon | null;
  isAdding: boolean;
  onOpenTeamPicker: () => void;
  onAddPokemon: (species: string) => Promise<void>;
  onSelectPokemon: (id: string | null) => void;
  onUpdatePokemon: (pokemon: BattlePokemon, manualSpread?: boolean) => void;
  onChangeCurrentHp: (pokemon: BattlePokemon, value: number) => void;
  onChangeBoost: (id: string, stat: BoostableStat, stage: number) => void;
  canResetStats: boolean;
  onResetStats: (pokemon: BattlePokemon) => void;
  onRemovePokemon: (id: string) => void;
  onSave: (name: string, source: string) => Promise<void>;
};

export function CalculatorTeamPanel({
  side, roster, selected, isAdding, onOpenTeamPicker, onAddPokemon,
  onSelectPokemon, onUpdatePokemon, onChangeCurrentHp, onChangeBoost, canResetStats, onResetStats, onRemovePokemon, onSave
}: Props) {
  const [species, setSpecies] = useState("");
  const [rules, setRules] = useState<ChampionsPokemonRules | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveSource, setSaveSource] = useState("Calculator");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedForme = selected?.forme;

  useEffect(() => {
    let active = true;
    setRules(null);
    if (selectedForme) {
      void loadChampionsPokemonRules(selectedForme)
        .then((next) => { if (active) setRules(next); })
        .catch(() => { if (active) setRules(null); });
    }
    return () => { active = false; };
  }, [selectedForme]);

  const title = side === "own" ? "My Team" : "Opponent Team";
  const maxHp = selected ? getMaxHp(selected) : 0;
  const hpPercent = selected ? Math.min(100, selected.currentHp / Math.max(1, maxHp) * 100) : 0;
  const hpColor = hpPercent > 50 ? "bg-emerald-500" : hpPercent > 20 ? "bg-amber-500" : "bg-red-500";
  const stats = selected ? calculateLevel50Stats(selected.member, { species: selected.forme, model: "champions" }) : null;
  const nature = selected ? getNatureModifiers(selected.member.nature) : {};
  const natureStats = getNatureStatPair(selected?.member.nature);
  const evTotal = selected ? pokemonStatIds.reduce((sum, stat) => sum + (selected.member.evs[stat] ?? 0), 0) : 0;

  function updateMember(patch: Partial<TeamMember>, manualSpread = false) {
    if (!selected) return;
    onUpdatePokemon({ ...selected, member: { ...selected.member, ...patch } }, manualSpread);
  }

  function changeForme(forme: string) {
    if (!selected) return;
    const next = { ...selected, forme, typeOverride: undefined, abilityOverride: forme === selected.member.species ? undefined : getFormeDefaultAbility(forme) };
    const nextMax = getMaxHp(next);
    onUpdatePokemon({ ...next, currentHp: Math.max(0, Math.round((selected.currentHp / Math.max(1, maxHp)) * nextMax)) });
  }

  function changeNatureStat(direction: "plus" | "minus", stat: PokemonStatId) {
    if (!selected) return;
    const next = getNatureForStats(direction === "plus" ? stat : natureStats.plus, direction === "minus" ? stat : natureStats.minus);
    if (next) updateMember({ nature: next }, true);
  }

  async function saveTeam() {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(saveName, saveSource);
      setSaveName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save team.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 border-t border-border pt-5 xl:border-t-0 xl:pt-0" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{roster.slots.length}/6</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary" type="button" onClick={onOpenTeamPicker}>
          <Users className="h-4 w-4" aria-hidden="true" /> Select team
        </button>
        <span className="flex h-10 items-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">{roster.teamId ? "Saved" : "Custom"}</span>
      </div>
      <div className="mt-2 flex min-w-0 gap-2">
        <input className={inputClass} list={`${side}-species`} value={species} onChange={(event) => setSpecies(event.target.value)} placeholder="Select Pokemon" aria-label={`${title} Pokemon`} />
        <datalist id={`${side}-species`}>{championsSpecies.map((name) => <option key={name} value={name} />)}</datalist>
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50" type="button" title="Add Pokemon" aria-label={`Add Pokemon to ${title}`} disabled={!species || isAdding} onClick={() => {
          void onAddPokemon(species).then(() => { setSpecies(""); setError(null); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not add Pokemon."));
        }}><Plus className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 flex min-h-16 gap-1 overflow-x-auto border-y border-border py-2" role="list" aria-label={`${title} roster`}>
        {roster.slots.length === 0 ? <p className="self-center px-2 text-xs text-muted-foreground">No Pokemon selected.</p> : null}
        {roster.slots.map((slot) => (
          <div className={`group relative h-12 w-12 shrink-0 rounded border ${slot.id === selected?.id ? "border-primary bg-primary/10" : "border-border bg-muted/50"}`} role="listitem" key={slot.id}>
            <button className="h-full w-full" type="button" title={`Edit ${slot.member.species}`} aria-label={`Edit ${slot.member.species}`} onClick={() => onSelectPokemon(slot.id)}>
              <img className="h-full w-full object-contain" src={getPokemonSpriteUrl(slot.forme)} alt="" />
              <Pencil className="absolute bottom-0 right-0 h-3 w-3 rounded bg-background text-foreground" aria-hidden="true" />
            </button>
            <button className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 focus:opacity-100 group-hover:opacity-100" type="button" title={`Remove ${slot.member.species}`} aria-label={`Remove ${slot.member.species}`} onClick={() => onRemovePokemon(slot.id)}><Trash2 className="h-2.5 w-2.5" /></button>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="mt-4">
          <div className="flex min-w-0 items-center gap-2">
            <img className="h-16 w-16 shrink-0 object-contain" src={getPokemonSpriteUrl(selected.forme)} alt={selected.forme} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{selected.forme}</p>
              <p className="text-xs text-muted-foreground">Level 50 · {(selected.typeOverride ?? getPokemonTypes(selected.forme)).join(" / ")}</p>
            </div>
            <button className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" type="button" title="Clear selected set" aria-label="Delete Set" onClick={() => onSelectPokemon(null)}><UserX className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <LabeledSelect label="Forme" value={selected.forme} values={getChampionsFormes(selected.member.species)} onChange={changeForme} />
            <LabeledSelect label="Nature" value={selected.member.nature ?? "Serious"} values={championsNatures} labels={championsNatures.map(getNatureOptionLabel)} onChange={(value) => updateMember({ nature: value as TeamMember["nature"] }, true)} />
            <label className="grid min-w-0 gap-1 text-xs font-medium">Type
              <span className="flex min-w-0 gap-1">
                <select className={inputClass} value={(selected.typeOverride ?? getPokemonTypes(selected.forme))[0] ?? ""} aria-label={`${title} primary type`} onChange={(event) => {
                  const currentTypes = selected.typeOverride ?? getPokemonTypes(selected.forme);
                  onUpdatePokemon({ ...selected, typeOverride: [event.target.value, currentTypes[1]].filter(Boolean) as BattlePokemon["typeOverride"] });
                }}>{getChampionsTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select>
                <select className={inputClass} value={(selected.typeOverride ?? getPokemonTypes(selected.forme))[1] ?? ""} aria-label={`${title} secondary type`} onChange={(event) => {
                  const currentTypes = selected.typeOverride ?? getPokemonTypes(selected.forme);
                  onUpdatePokemon({ ...selected, typeOverride: [currentTypes[0], event.target.value].filter(Boolean) as BattlePokemon["typeOverride"] });
                }}><option value="">None</option>{getChampionsTypes().map((type) => <option key={type} value={type}>{type}</option>)}</select>
              </span>
            </label>
            <LabeledSelect label="Ability" value={selected.abilityOverride ?? selected.member.ability ?? ""} values={rules?.abilities ?? [selected.abilityOverride ?? selected.member.ability ?? ""]} onChange={(value) => {
              if (selected.forme === selected.member.species) onUpdatePokemon({ ...selected, abilityOverride: undefined, member: { ...selected.member, ability: value } });
              else onUpdatePokemon({ ...selected, abilityOverride: value });
            }} />
            <label className="grid min-w-0 gap-1 text-xs font-medium">Item
              <span className="flex min-w-0 items-center gap-1">
                <select className={inputClass} value={selected.member.item ?? ""} onChange={(event) => updateMember({ item: event.target.value })}>
                  <option value="">Select item</option>{championsItems.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {selected.member.item ? <img className="h-8 w-8 shrink-0 object-contain" src={getChampionsItemIconUrl(selected.member.item)} alt="" /> : null}
              </span>
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LabeledSelect label="Status" value={selected.status} values={["", "brn", "par", "psn", "tox", "slp", "frz"]} labels={["Healthy", "Burn", "Paralysis", "Poison", "Toxic", "Sleep", "Freeze"]} onChange={(value) => onUpdatePokemon({ ...selected, status: value as BattlePokemon["status"] })} />
            <label className="grid gap-1 text-xs font-medium">Current HP
              <span className="flex h-10 items-center gap-1 rounded-md border border-input px-2">
                <input className="min-w-0 w-full bg-transparent text-sm tabular-nums outline-none" type="number" min={0} max={maxHp} step={1} value={selected.currentHp} aria-label={`${title} current HP`} onChange={(event) => onChangeCurrentHp(selected, Number(event.target.value) || 0)} />
                <span className="shrink-0 text-xs text-muted-foreground">/ {maxHp}</span>
              </span>
            </label>
          </div>
          <div className="relative mt-2 flex h-7 items-center rounded focus-within:ring-2 focus-within:ring-primary/30">
            <div className="pointer-events-none h-2 w-full overflow-hidden rounded bg-secondary"><div className={`h-full ${hpColor}`} style={{ width: `${hpPercent}%` }} /></div>
            <span className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow ${hpColor}`} style={{ left: `clamp(8px, ${hpPercent}%, calc(100% - 8px))` }} />
            <input className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" type="range" min={0} max={maxHp} step={1} value={selected.currentHp} onChange={(event) => onChangeCurrentHp(selected, Number(event.target.value))} aria-label={`${title} HP slider`} title="Drag to set current HP" />
          </div>
          <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">{Math.round(hpPercent)}%</p>

          <div className="mt-3 overflow-x-auto">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Stats</span>
              <button className="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-40" type="button" disabled={!canResetStats} onClick={() => onResetStats(selected)} title="Restore loaded stats, HP and stat stages"><RotateCcw className="h-3.5 w-3.5" /> Reset stats</button>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <label className="grid min-w-0 gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Nature raises
                <select className={inputClass} value={natureStats.plus} onChange={(event) => changeNatureStat("plus", event.target.value as PokemonStatId)}>
                  {natureStatIds.map((stat) => <option key={stat} value={stat}>{statLabels[stat]}</option>)}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-medium text-red-700 dark:text-red-300">Nature lowers
                <select className={inputClass} value={natureStats.minus} onChange={(event) => changeNatureStat("minus", event.target.value as PokemonStatId)}>
                  {natureStatIds.map((stat) => <option key={stat} value={stat}>{statLabels[stat]}</option>)}
                </select>
              </label>
            </div>
            <table className="w-full table-fixed text-xs tabular-nums">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="py-1 text-left">Stat</th><th className="text-right">Base</th><th className="text-right">EVs</th><th className="text-right">Stage</th><th className="text-right">Battle</th></tr></thead>
              <tbody>{pokemonStatIds.map((stat) => {
                const stage = stat === "hp" ? 0 : selected.boosts?.[stat] ?? 0;
                const final = stats?.stats[stat];
                return <tr key={stat} className={`border-b border-border/60 ${nature.plus === stat ? "text-emerald-700 dark:text-emerald-300" : nature.minus === stat ? "text-red-700 dark:text-red-300" : ""}`}>
                  <th className="py-1.5 text-left font-medium">{statLabels[stat]} {nature.plus === stat ? "↑" : nature.minus === stat ? "↓" : ""}</th>
                  <td className="text-right">{stats?.baseStats[stat]}</td>
                  <td className="text-right"><input className="w-12 rounded border border-input bg-background px-1 py-1 text-right outline-none focus:border-primary" type="number" min={0} max={32} value={selected.member.evs[stat] ?? 0} aria-label={`${title} ${statLabels[stat]} EVs`} onChange={(event) => updateMember({ evs: { ...selected.member.evs, [stat]: Math.max(0, Math.min(32, Number(event.target.value) || 0)) } }, true)} /></td>
                  <td className="text-right">{stat === "hp" ? "—" : <select className="w-14 rounded border border-input bg-background px-0.5 py-1 text-right tabular-nums outline-none focus:border-primary" value={stage} aria-label={`${title} ${statLabels[stat]} stage`} onChange={(event) => onChangeBoost(selected.id, stat, Number(event.target.value))}>{stageOptions.map((value) => <option key={value} value={value}>{value > 0 ? `+${value}` : value}</option>)}</select>}</td>
                  <td className="text-right font-semibold">{final === undefined ? "—" : getBoostedStat(final, stage)}{stage !== 0 && final !== undefined ? <span className="block text-[10px] font-normal text-muted-foreground">{final} raw</span> : null}</td>
                </tr>;
              })}</tbody>
            </table>
            <p className={`mt-1 text-right text-xs font-medium tabular-nums ${evTotal > 66 ? "text-destructive" : "text-muted-foreground"}`}>{evTotal}/66 EVs</p>
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Moves</h3>
            <div className="mt-2 grid gap-2">
              {Array.from({ length: 4 }, (_, index) => {
                const move = selected.member.moves[index] ?? "";
                const info = getMoveInfo(move);
                return (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
                    <div className="min-w-0">
                      <select className={inputClass} value={move} aria-label={`${title} move ${index + 1}`} onChange={(event) => {
                        const moves = Array.from({ length: 4 }, (_, moveIndex) => selected.member.moves[moveIndex] ?? "");
                        moves[index] = event.target.value;
                        updateMember({ moves: moves.filter(Boolean) });
                      }}>
                        <option value="">No move</option>{(rules?.moves ?? (move ? [move] : [])).map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{info ? `${info.power || "—"} power · ${info.type} · ${info.category}` : "—"}</p>
                    </div>
                    <label className="grid justify-items-center gap-0.5 text-[10px] font-medium text-muted-foreground">Crit
                      <input type="checkbox" checked={selected.criticalMoves.includes(toID(move))} disabled={!move} onChange={(event) => {
                        const id = toID(move);
                        const criticalMoves = event.target.checked ? [...selected.criticalMoves, id] : selected.criticalMoves.filter((value) => value !== id);
                        onUpdatePokemon({ ...selected, criticalMoves });
                      }} />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : <p className="mt-4 border-b border-border pb-5 text-sm text-muted-foreground">Select a Pokemon in the roster to edit its set.</p>}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Save as new team</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className={inputClass} value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Team name" aria-label={`${title} new team name`} />
          <input className={inputClass} value={saveSource} onChange={(event) => setSaveSource(event.target.value)} placeholder="Source" aria-label={`${title} new team source`} />
        </div>
        {error ? <p className="mt-2 text-xs text-destructive" role="alert">{error}</p> : null}
        <button className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 text-sm font-semibold text-background disabled:opacity-50" type="button" disabled={isSaving || !saveName.trim() || !saveSource.trim() || roster.slots.length === 0} onClick={() => void saveTeam()}><Save className="h-4 w-4" />{isSaving ? "Saving..." : "Save team"}</button>
      </div>
    </section>
  );
}

const inputClass = "h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";
const stageOptions = Array.from({ length: 13 }, (_, index) => index - 6);

function LabeledSelect({ label, value, values, labels, onChange }: {
  label: string; value: string; values: string[]; labels?: string[]; onChange: (value: string) => void;
}) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium">{label}<select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{values.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></label>;
}
