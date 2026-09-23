import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { CalculatorFieldPanel } from "@/features/calculator/CalculatorFieldPanel";
import { CalculatorTeamPanel } from "@/features/calculator/CalculatorTeamPanel";
import { CalculatorTeamPicker } from "@/features/calculator/CalculatorTeamPicker";
import { DamageOverview } from "@/features/calculator/DamageOverview";
import {
  battleBoostKey, clearBattleBoost, clearSideBattleBoosts, setBattleBoost, withBattleBoosts,
  type BattleBoostState
} from "@/lib/pokemon/battle-boosts";
import {
  battleHpKey, clearBattleCurrentHp, clearSideBattleHp, setBattleCurrentHp, withBattleCurrentHp,
  type BattleHpState
} from "@/lib/pokemon/battle-hp";
import { createChampionsMember, loadChampionsPokemonRules } from "@/lib/pokemon/champions-data";
import {
  addPokemonToRoster, captureInitialStats, loadRoster, readCalculatorSession, removeRosterPokemon,
  restoreInitialStats, startNewBattle, updateRosterPokemon, writeCalculatorSession, type CalculatorSession, type InitialPokemonStats
} from "@/lib/pokemon/calculator-session";
import { buildOpponentPreset, getMaxHp, normalizeBattlePokemonAbility, type BattleFieldState, type BattlePokemon, type BattleSide } from "@/lib/pokemon/damage-calculation";
import { estimateOpponentSet, type DamageObservation } from "@/lib/pokemon/damage-observations";
import { applyIndividualSetDefault, memberForSavedTeam } from "@/lib/pokemon/individual-set";
import { buildSavedTeam, buildSavedTeamFromEditor, loadPokepasteText, type SavedTeam, type TeamLibrary } from "@/lib/pokemon/team-import";
import type { PokemonNature } from "@/lib/pokemon/types";
import type { AppProfile } from "@/lib/supabase/auth";
import { getPopularPokemonCommonSet } from "@/lib/supabase/popular-common-sets";
import { loadTeamLibrary, saveTeamToLibrary } from "@/lib/supabase/teams";

const emptyLibrary: TeamLibrary = { own: [], opponent: [] };

export function CalculatorWorkspace({ profile }: { profile: AppProfile }) {
  const [session, setSession] = useState<CalculatorSession>(() => readCalculatorSession(profile.id));
  const [library, setLibrary] = useState<TeamLibrary>(emptyLibrary);
  const [pickerSide, setPickerSide] = useState<BattleSide | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialStats, setInitialStats] = useState<Record<string, InitialPokemonStats>>({});
  const [boosts, setBoosts] = useState<BattleBoostState>({});
  const [currentHp, setCurrentHp] = useState<BattleHpState>({});

  useEffect(() => {
    let active = true;
    void loadTeamLibrary(profile.id).then((result) => {
      if (active) setLibrary(result);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load saved teams.");
    });
    return () => { active = false; };
  }, [profile.id]);

  useEffect(() => writeCalculatorSession(profile.id, session), [profile.id, session]);

  const selectedOwn = session.own.slots.find((slot) => slot.id === session.own.selectedId) ?? null;
  const selectedOpponent = session.opponent.slots.find((slot) => slot.id === session.opponent.selectedId) ?? null;
  const estimate = useMemo(() => selectedOpponent
    ? estimateOpponentSet(selectedOpponent, session.observations)
    : null, [selectedOpponent, session.observations]);
  const usingEstimate = Boolean(selectedOpponent && estimate && !session.disabledEstimates.includes(selectedOpponent.id));
  const effectiveOpponent = selectedOpponent && usingEstimate && estimate
    ? {
        ...selectedOpponent,
        member: estimate.member,
        currentHp: Math.round((selectedOpponent.currentHp / Math.max(1, getMaxHp(selectedOpponent))) * getMaxHp({ ...selectedOpponent, member: estimate.member }))
      }
    : selectedOpponent;
  const ownForBattle = selectedOwn
    ? normalizeBattlePokemonAbility(withBattleCurrentHp(withBattleBoosts(selectedOwn, boosts[battleBoostKey("own", selectedOwn.id)]), currentHp[battleHpKey("own", selectedOwn.id)]))
    : null;
  const opponentForBattle = effectiveOpponent
    ? normalizeBattlePokemonAbility(withBattleCurrentHp(withBattleBoosts(effectiveOpponent, boosts[battleBoostKey("opponent", effectiveOpponent.id)]), currentHp[battleHpKey("opponent", effectiveOpponent.id)]))
    : null;

  function selectRosterPokemon(side: BattleSide, id: string | null) {
    setSession((current) => ({ ...current, [side]: { ...current[side], selectedId: id }, selectedMove: null }));
  }

  function updatePokemon(side: BattleSide, pokemon: BattlePokemon, manualSpread = false) {
    setSession((current) => {
      const updated = updateRosterPokemon(current, side, pokemon);
      return side === "opponent" && manualSpread
        ? { ...updated, disabledEstimates: [...new Set([...updated.disabledEstimates, pokemon.id])] }
        : updated;
    });
  }

  async function addIndividualPokemon(side: BattleSide, species: string) {
    setIsAdding(true);
    setError(null);
    try {
      const rules = await loadChampionsPokemonRules(species);
      const base = await createChampionsMember(rules.species);
      const common = profile.isLocal ? null : await getPopularPokemonCommonSet(rules.species);
      const member = applyIndividualSetDefault(base, rules, common, session[side].slots.map((slot) => slot.member.item));
      const id = crypto.randomUUID();
      setInitialStats((current) => ({ ...current, [`${side}:${id}`]: captureInitialStats(member) }));
      setSession((current) => addPokemonToRoster(current, side, member, id));
    } finally {
      setIsAdding(false);
    }
  }

  async function saveRoster(side: BattleSide, name: string, source: string) {
    const team = await buildSavedTeamFromEditor({
      ownerId: profile.id, name, source, destination: side,
      team: {
        format: "champions",
        members: session[side].slots.map((slot) => memberForSavedTeam(side === "opponent" && slot.id === effectiveOpponent?.id ? effectiveOpponent : slot))
      }
    });
    const next = await saveTeamToLibrary(profile.id, team, side);
    setLibrary(next);
    setSession((current) => ({ ...current, [side]: { ...current[side], teamId: team.id } }));
  }

  async function importTeam(side: BattleSide, value: string, method: "text" | "pokepaste") {
    const pasteText = method === "pokepaste" ? await loadPokepasteText(value) : value;
    const team = await buildSavedTeam({
      ownerId: profile.id, name: "Imported team", source: "Calculator import", pasteText,
      pasteUrl: method === "pokepaste" ? value : undefined, destination: side
    });
    selectTeam(side, team);
  }

  function recordDamage(side: BattleSide, move: string, damage: number) {
    if (!ownForBattle || !selectedOpponent || !opponentForBattle) return;
    const observation: DamageObservation = {
      id: crypto.randomUUID(), opponentId: selectedOpponent.id,
      own: structuredClone(ownForBattle), opponent: structuredClone(opponentForBattle),
      attackerSide: side, move, damage, unit: side === "own" ? "percent" : "hp",
      temporaryBattleState: currentHp[battleHpKey("own", ownForBattle.id)] !== undefined || currentHp[battleHpKey("opponent", selectedOpponent.id)] !== undefined,
      field: structuredClone(session.field)
    };
    setSession((current) => ({
      ...current, observations: [...current.observations, observation],
      disabledEstimates: current.disabledEstimates.filter((id) => id !== selectedOpponent.id)
    }));
  }

  function applyPreset(strategy: "bulky" | "fast" | "offensive", variant: "physically" | "specially" | "balanced" | "min" | "medium") {
    if (!selectedOpponent) return;
    const preset = buildOpponentPreset(selectedOpponent.member, selectedOpponent.forme, strategy, variant);
    updatePokemon("opponent", { ...selectedOpponent, member: { ...selectedOpponent.member, ...preset } }, true);
  }

  function changeOpponentNature(nature: PokemonNature) {
    if (!selectedOpponent) return;
    updatePokemon("opponent", { ...selectedOpponent, member: { ...selectedOpponent.member, nature } }, true);
  }

  function selectTeam(side: BattleSide, team: SavedTeam) {
    setBoosts((current) => clearSideBattleBoosts(current, side));
    setCurrentHp((current) => clearSideBattleHp(current, side));
    setInitialStats((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${side}:`))),
      ...Object.fromEntries(team.team.members.map((member, index) => [`${side}:${team.id}:${index}`, captureInitialStats(member)]))
    }));
    setSession((current) => loadRoster(current, side, team));
  }

  function resetStats(side: BattleSide, pokemon: BattlePokemon) {
    setBoosts((current) => clearBattleBoost(current, side, pokemon.id));
    setCurrentHp((current) => clearBattleCurrentHp(current, side, pokemon.id));
    const initial = initialStats[`${side}:${pokemon.id}`];
    if (!initial) return;
    updatePokemon(side, restoreInitialStats(pokemon, initial), true);
  }

  function newBattle() {
    setInitialStats({});
    setBoosts({});
    setCurrentHp({});
    setSession(startNewBattle);
  }

  function removePokemon(side: BattleSide, id: string) {
    setBoosts((current) => clearBattleBoost(current, side, id));
    setCurrentHp((current) => clearBattleCurrentHp(current, side, id));
    setSession((current) => removeRosterPokemon(current, side, id));
  }

  function changeField(field: BattleFieldState) {
    setSession((current) => ({ ...current, field }));
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 border-b border-border pb-4">
        <p className="text-sm font-semibold text-primary">Battle</p>
        <h1 className="text-2xl font-semibold">Pokemon damage calculator</h1>
      </div>
      {error ? <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert"><AlertCircle className="h-4 w-4" /> {error}</div> : null}
      <DamageOverview
        own={ownForBattle} opponent={opponentForBattle} field={session.field}
        selectedMove={session.selectedMove} observations={session.observations}
        estimate={estimate} usingEstimate={usingEstimate}
        onSelectMove={(selectedMove) => setSession((current) => ({ ...current, selectedMove }))}
        onRecord={recordDamage}
        onRemoveObservation={(id) => setSession((current) => ({ ...current, observations: current.observations.filter((observation) => observation.id !== id) }))}
        onPreset={applyPreset} onNature={changeOpponentNature}
        onToggleEstimate={(active) => setSession((current) => ({ ...current, disabledEstimates: active ? current.disabledEstimates.filter((id) => id !== selectedOpponent?.id) : [...new Set([...current.disabledEstimates, selectedOpponent?.id ?? ""])] }))}
      />
      <div className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,350px)_minmax(0,1fr)]">
        <CalculatorTeamPanel
          side="own" roster={session.own} selected={ownForBattle} isAdding={isAdding}
          onOpenTeamPicker={() => setPickerSide("own")}
          onAddPokemon={(species) => addIndividualPokemon("own", species)}
          onSelectPokemon={(id) => selectRosterPokemon("own", id)}
          onUpdatePokemon={(pokemon, manual) => updatePokemon("own", pokemon, manual)}
          onChangeCurrentHp={(pokemon, value) => setCurrentHp((current) => setBattleCurrentHp(current, "own", pokemon, value))}
          onChangeBoost={(id, stat, stage) => setBoosts((current) => setBattleBoost(current, "own", id, stat, stage))}
          canResetStats={Boolean(selectedOwn && (initialStats[`own:${selectedOwn.id}`] || boosts[battleBoostKey("own", selectedOwn.id)] || currentHp[battleHpKey("own", selectedOwn.id)] !== undefined))}
          onResetStats={(pokemon) => resetStats("own", pokemon)}
          onRemovePokemon={(id) => removePokemon("own", id)}
          onSave={(name, source) => saveRoster("own", name, source)}
        />
        <CalculatorFieldPanel field={session.field} onChange={changeField} onNewBattle={newBattle} onImport={importTeam} />
        <CalculatorTeamPanel
          side="opponent" roster={session.opponent} selected={opponentForBattle} isAdding={isAdding}
          onOpenTeamPicker={() => setPickerSide("opponent")}
          onAddPokemon={(species) => addIndividualPokemon("opponent", species)}
          onSelectPokemon={(id) => selectRosterPokemon("opponent", id)}
          onUpdatePokemon={(pokemon, manual) => updatePokemon("opponent", pokemon, manual)}
          onChangeCurrentHp={(pokemon, value) => setCurrentHp((current) => setBattleCurrentHp(current, "opponent", pokemon, value))}
          onChangeBoost={(id, stat, stage) => setBoosts((current) => setBattleBoost(current, "opponent", id, stat, stage))}
          canResetStats={Boolean(selectedOpponent && (initialStats[`opponent:${selectedOpponent.id}`] || boosts[battleBoostKey("opponent", selectedOpponent.id)] || currentHp[battleHpKey("opponent", selectedOpponent.id)] !== undefined))}
          onResetStats={(pokemon) => resetStats("opponent", pokemon)}
          onRemovePokemon={(id) => removePokemon("opponent", id)}
          onSave={(name, source) => saveRoster("opponent", name, source)}
        />
      </div>
      <CalculatorTeamPicker
        open={pickerSide !== null} side={pickerSide ?? "own"} library={library}
        onClose={() => setPickerSide(null)} onSelect={(team) => selectTeam(pickerSide ?? "own", team)}
      />
    </div>
  );
}
