import { useMemo, useState } from "react";
import { Check, Save, Trash2 } from "lucide-react";
import { championsNatures, getNatureOptionLabel } from "@/lib/pokemon/champions-data";
import {
  calculateDamage,
  getEndTurnHpChange,
  getMaxHp,
  type BattleFieldState,
  type BattlePokemon,
  type BattleSide,
  type DamageCalculation
} from "@/lib/pokemon/damage-calculation";
import type { DamageObservation, OpponentEstimate } from "@/lib/pokemon/damage-observations";
import { getPokemonSpriteUrl } from "@/lib/pokemon/team-stats";
import type { PokemonNature } from "@/lib/pokemon/types";

type MoveSelection = { side: BattleSide; move: string };

type Props = {
  own: BattlePokemon | null;
  opponent: BattlePokemon | null;
  field: BattleFieldState;
  selectedMove: MoveSelection | null;
  observations: DamageObservation[];
  estimate: OpponentEstimate | null;
  usingEstimate: boolean;
  onSelectMove: (selection: MoveSelection) => void;
  onRecord: (side: BattleSide, move: string, damage: number) => void;
  onRemoveObservation: (id: string) => void;
  onPreset: (strategy: "bulky" | "fast" | "offensive", variant: "physically" | "specially" | "balanced" | "min" | "medium") => void;
  onNature: (nature: PokemonNature) => void;
  onToggleEstimate: (active: boolean) => void;
};

export function DamageOverview({ own, opponent, field, selectedMove, observations, estimate, usingEstimate, onSelectMove, onRecord, onRemoveObservation, onPreset, onNature, onToggleEstimate }: Props) {
  const [strategy, setStrategy] = useState<"bulky" | "fast" | "offensive">("bulky");
  const [variant, setVariant] = useState<"physically" | "specially" | "balanced" | "min" | "medium">("balanced");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const ownResults = useMemo(() => own && opponent ? own.member.moves.slice(0, 4).map((move) => safeCalculate(own, opponent, move, "own", field)) : [], [own, opponent, field]);
  const opponentResults = useMemo(() => own && opponent ? opponent.member.moves.slice(0, 4).map((move) => safeCalculate(opponent, own, move, "opponent", field)) : [], [own, opponent, field]);
  const selection = selectedMove && (selectedMove.side === "own" ? own?.member.moves : opponent?.member.moves)?.includes(selectedMove.move)
    ? selectedMove
    : own?.member.moves[0] ? { side: "own" as const, move: own.member.moves[0] } : opponent?.member.moves[0] ? { side: "opponent" as const, move: opponent.member.moves[0] } : null;
  const selectedIndex = selection ? (selection.side === "own" ? own : opponent)?.member.moves.indexOf(selection.move) ?? -1 : -1;
  const selectedResult = selection && selectedIndex >= 0 ? (selection.side === "own" ? ownResults : opponentResults)[selectedIndex] : null;
  const relevantObservations = observations.filter((observation) => observation.opponentId === opponent?.id);

  function applyStrategy(nextStrategy: "bulky" | "fast" | "offensive") {
    const nextVariant = nextStrategy === "bulky" ? "balanced" : "min";
    setStrategy(nextStrategy);
    setVariant(nextVariant);
    onPreset(nextStrategy, nextVariant);
  }

  function record(side: BattleSide, move: string) {
    const key = `${side}:${move}`;
    const damage = Number(inputs[key]);
    const target = side === "own" ? opponent : own;
    if (!Number.isFinite(damage) || damage < 0 || !target || (side === "own" ? damage > 100 : !Number.isInteger(damage) || damage > target.currentHp)) return;
    onRecord(side, move, damage);
    setInputs((current) => ({ ...current, [key]: "" }));
  }

  return (
    <section className="border-b border-border pb-6" aria-label="Damage calculations">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)_minmax(0,1fr)]">
        <MoveResults
          title="My Team moves" side="own" pokemon={own} results={ownResults} selection={selection}
          inputs={inputs} onInput={(key, value) => setInputs((current) => ({ ...current, [key]: value }))}
          onSelect={onSelectMove} onRecord={record}
        />
        <div className="min-w-0 border-y border-border py-4 lg:border-x lg:border-y-0 lg:px-5 lg:py-0">
          <div className="flex min-h-28 items-center justify-center gap-3">
            <PokemonPortrait pokemon={own} label="My Team" />
            <span className="text-sm font-bold text-muted-foreground">VS</span>
            <PokemonPortrait pokemon={opponent} label="Opponent" />
          </div>
          {opponent ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Opponent profile</p>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {(["bulky", "fast", "offensive"] as const).map((option) => <button key={option} className={choiceClass(strategy === option)} type="button" onClick={() => applyStrategy(option)}>{option}</button>)}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {(strategy === "bulky" ? ["physically", "specially", "balanced"] as const : ["min", "medium"] as const).map((option) => <button key={option} className={choiceClass(variant === option)} type="button" onClick={() => { setVariant(option); onPreset(strategy, option); }}>{strategy === "bulky" ? option : `${option} bulk`}</button>)}
              </div>
              <label className="mt-3 grid gap-1 text-xs font-medium">Nature
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={opponent.member.nature ?? "Serious"} onChange={(event) => onNature(event.target.value as PokemonNature)}>{championsNatures.map((nature) => <option key={nature} value={nature}>{getNatureOptionLabel(nature)}</option>)}</select>
              </label>
              {estimate ? (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">{estimate.matched}/{estimate.total} observed rolls fit</span>
                  <label className="flex items-center gap-1 text-xs font-medium"><input type="checkbox" checked={usingEstimate} onChange={(event) => onToggleEstimate(event.target.checked)} /> Estimate</label>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <MoveResults
          title="Opponent moves" side="opponent" pokemon={opponent} results={opponentResults} selection={selection}
          inputs={inputs} onInput={(key, value) => setInputs((current) => ({ ...current, [key]: value }))}
          onSelect={onSelectMove} onRecord={record}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h2 className="text-sm font-semibold">Damage summary</h2>
        {selectedResult && own && opponent ? (
          <>
            <p className="mt-2 text-sm leading-6">{selectedResult.description}</p>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">{selectedResult.min}–{selectedResult.max} HP · {selectedResult.minPercent}–{selectedResult.maxPercent}% · {selectedResult.koChance}</p>
            <div className="mt-3 flex flex-wrap gap-1" aria-label="Possible damage rolls">
              {selectedResult.rolls.map((damage, index) => <span key={index} className="min-w-7 rounded bg-secondary px-1.5 py-1 text-center text-xs tabular-nums">{damage}</span>)}
            </div>
            {(["own", "opponent"] as const).map((side) => {
              const pokemon = side === "own" ? own : opponent;
              const change = getEndTurnHpChange(pokemon, field[side]);
              return change !== 0 ? <p key={side} className="mt-2 text-xs text-muted-foreground">{side === "own" ? "My Team" : "Opponent"} end-turn HP: {change > 0 ? "+" : ""}{change}</p> : null;
            })}
          </>
        ) : <p className="mt-2 text-sm text-muted-foreground">Select one Pokemon on each side to calculate damage.</p>}
      </div>

      {relevantObservations.length ? (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Recorded damage</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {relevantObservations.map((observation) => (
              <div key={observation.id} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                <span>{observation.attackerSide === "own" ? observation.own.forme : observation.opponent.forme} · {observation.move} · {observation.damage}{observation.unit === "percent" ? "%" : " HP"}</span>
                <button className="rounded p-0.5 hover:bg-secondary" type="button" title="Remove observation" aria-label="Remove observation" onClick={() => onRemoveObservation(observation.id)}><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MoveResults({ title, side, pokemon, results, selection, inputs, onInput, onSelect, onRecord }: {
  title: string;
  side: BattleSide;
  pokemon: BattlePokemon | null;
  results: (DamageCalculation | null)[];
  selection: MoveSelection | null;
  inputs: Record<string, string>;
  onInput: (key: string, value: string) => void;
  onSelect: (selection: MoveSelection) => void;
  onRecord: (side: BattleSide, move: string) => void;
}) {
  return <div className="min-w-0">
    <h2 className="mb-3 text-sm font-semibold">{title}</h2>
    <div className="grid gap-2">
      {Array.from({ length: 4 }, (_, index) => {
        const move = pokemon?.member.moves[index];
        const result = results[index];
        const key = `${side}:${move ?? index}`;
        return <div key={index} className={`grid min-h-14 grid-cols-[minmax(0,1fr)_5rem] items-center gap-2 rounded-md border px-2 py-1.5 ${move && selection?.side === side && selection.move === move ? "border-primary bg-primary/5" : "border-border"}`}>
          <button className="min-w-0 text-left" type="button" disabled={!move} onClick={() => move && onSelect({ side, move })}>
            <span className="block truncate text-sm font-semibold">{move ?? "—"}</span>
            <span className="block text-xs tabular-nums text-muted-foreground">{result ? `${result.minPercent}–${result.maxPercent}%` : "—"}</span>
          </button>
          <div className="flex min-w-0 items-center gap-1">
            <input className="h-8 w-full min-w-0 rounded border border-input bg-background px-1 text-center text-xs tabular-nums" type="number" min={0} max={side === "own" ? 100 : 999} step={side === "own" ? 0.1 : 1} value={inputs[key] ?? ""} onChange={(event) => onInput(key, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && move) onRecord(side, move); }} disabled={!move} placeholder={side === "own" ? "%" : "HP"} aria-label={`${side === "own" ? "My Team" : "Opponent"} ${move ?? `move ${index + 1}`} observed damage (${side === "own" ? "%" : "HP"})`} />
            <button className="flex h-8 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10 disabled:opacity-30" type="button" disabled={!move || inputs[key] === undefined || inputs[key] === ""} title="Record damage" aria-label={`Record ${move ?? "move"} damage`} onClick={() => move && onRecord(side, move)}><Save className="h-3.5 w-3.5" /></button>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function PokemonPortrait({ pokemon, label }: { pokemon: BattlePokemon | null; label: string }) {
  return <div className="grid min-w-0 justify-items-center gap-1 text-center">
    <div className="flex h-20 w-24 items-center justify-center">{pokemon ? <img className="max-h-20 max-w-24 object-contain" src={getPokemonSpriteUrl(pokemon.forme)} alt={pokemon.forme} /> : <span className="text-3xl text-muted-foreground">?</span>}</div>
    <span className="max-w-28 truncate text-xs font-semibold">{pokemon?.forme ?? label}</span>
    {pokemon ? <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Check className="h-3 w-3" /> {pokemon.currentHp}/{getMaxHp(pokemon)} HP</span> : null}
  </div>;
}

function safeCalculate(attacker: BattlePokemon, defender: BattlePokemon, move: string, side: BattleSide, field: BattleFieldState) {
  try { return calculateDamage(attacker, defender, move, side, field); } catch { return null; }
}

function choiceClass(active: boolean) {
  return `min-h-8 rounded border px-1 py-1 text-xs font-semibold capitalize ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`;
}
