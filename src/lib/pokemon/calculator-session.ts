import {
  defaultBattleField,
  getMaxHp,
  makeBattlePokemon,
  normalizeBattlePokemonAbility,
  type BattleFieldState,
  type BattlePokemon,
  type BattleSide
} from "@/lib/pokemon/damage-calculation";
import { hasBattleBoosts, withoutBattleBoosts } from "@/lib/pokemon/battle-boosts";
import type { DamageObservation } from "@/lib/pokemon/damage-observations";
import type { SavedTeam } from "@/lib/pokemon/team-import";
import type { TeamMember } from "@/lib/pokemon/types";

export type CalculatorRoster = {
  slots: BattlePokemon[];
  selectedId: string | null;
  teamId: string | null;
};

export type CalculatorSession = {
  own: CalculatorRoster;
  opponent: CalculatorRoster;
  field: BattleFieldState;
  observations: DamageObservation[];
  disabledEstimates: string[];
  selectedMove: { side: BattleSide; move: string } | null;
};

export type InitialPokemonStats = Pick<TeamMember, "evs" | "ivs" | "nature">;

export function captureInitialStats(member: TeamMember): InitialPokemonStats {
  return { evs: { ...member.evs }, ivs: { ...member.ivs }, nature: member.nature };
}

export function restoreInitialStats(pokemon: BattlePokemon, initial: InitialPokemonStats): BattlePokemon {
  const restored = { ...pokemon, member: { ...pokemon.member, ...structuredClone(initial) } };
  return {
    ...restored,
    currentHp: Math.round(pokemon.currentHp / Math.max(1, getMaxHp(pokemon)) * getMaxHp(restored))
  };
}

const storagePrefix = "sbc.calculator-session.";

export function emptyCalculatorSession(): CalculatorSession {
  return {
    own: { slots: [], selectedId: null, teamId: null },
    opponent: { slots: [], selectedId: null, teamId: null },
    field: defaultBattleField(), observations: [], disabledEstimates: [], selectedMove: null
  };
}

export function loadRoster(session: CalculatorSession, side: BattleSide, team: SavedTeam): CalculatorSession {
  const slots = team.team.members.map((member, index) => makeBattlePokemon(member, `${team.id}:${index}`));
  return {
    ...session,
    [side]: { slots, selectedId: slots[0]?.id ?? null, teamId: team.id },
    selectedMove: session.selectedMove?.side === side ? null : session.selectedMove
  };
}

export function addPokemonToRoster(session: CalculatorSession, side: BattleSide, member: TeamMember, id?: string): CalculatorSession {
  const added = makeBattlePokemon(member, id);
  const roster = session[side];
  return {
    ...session,
    [side]: { slots: [...roster.slots.slice(0, 5), added], selectedId: added.id, teamId: null },
    selectedMove: session.selectedMove?.side === side ? null : session.selectedMove
  };
}

export function updateRosterPokemon(session: CalculatorSession, side: BattleSide, pokemon: BattlePokemon): CalculatorSession {
  const roster = session[side];
  return {
    ...session,
    [side]: { ...roster, slots: roster.slots.map((slot) => slot.id === pokemon.id ? persistentBattlePokemon(pokemon) : slot), teamId: null }
  };
}

export function removeRosterPokemon(session: CalculatorSession, side: BattleSide, id: string): CalculatorSession {
  const roster = session[side];
  const slots = roster.slots.filter((slot) => slot.id !== id);
  return {
    ...session,
    [side]: {
      slots, teamId: null,
      selectedId: roster.selectedId === id ? slots[0]?.id ?? null : roster.selectedId
    },
    selectedMove: roster.selectedId === id && session.selectedMove?.side === side ? null : session.selectedMove
  };
}

export function startNewBattle(session: CalculatorSession): CalculatorSession {
  return {
    ...session,
    opponent: { slots: [], selectedId: null, teamId: null },
    field: defaultBattleField(),
    observations: [],
    disabledEstimates: [],
    selectedMove: null
  };
}

export function readCalculatorSession(userId: string): CalculatorSession {
  try {
    const raw = localStorage.getItem(`${storagePrefix}${userId}`);
    if (!raw) return emptyCalculatorSession();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return emptyCalculatorSession();
    const session = value as CalculatorSession;
    if (!Array.isArray(session.own?.slots) || !Array.isArray(session.opponent?.slots) || !Array.isArray(session.observations)) {
      return emptyCalculatorSession();
    }
    const observations = session.observations.filter((observation) => !observation.temporaryBattleState && !hasBattleBoosts(observation.own) && !hasBattleBoosts(observation.opponent)).map((observation) => {
      if (observation.unit) return observation;
      return observation.attackerSide === "own"
        ? { ...observation, damage: Math.round(observation.damage / getMaxHp(observation.opponent) * 1000) / 10, unit: "percent" as const }
        : { ...observation, unit: "hp" as const };
    });
    return {
      ...session,
      own: { ...session.own, slots: session.own.slots.map(persistentBattlePokemon) },
      opponent: { ...session.opponent, slots: session.opponent.slots.map(persistentBattlePokemon) },
      observations,
      disabledEstimates: Array.isArray(session.disabledEstimates) ? session.disabledEstimates : []
    };
  } catch {
    return emptyCalculatorSession();
  }
}

export function writeCalculatorSession(userId: string, session: CalculatorSession) {
  const persistent = {
    ...session,
    own: { ...session.own, slots: session.own.slots.map(persistentBattlePokemon) },
    opponent: { ...session.opponent, slots: session.opponent.slots.map(persistentBattlePokemon) },
    observations: session.observations.filter((observation) => !observation.temporaryBattleState && !hasBattleBoosts(observation.own) && !hasBattleBoosts(observation.opponent))
  };
  localStorage.setItem(`${storagePrefix}${userId}`, JSON.stringify(persistent));
}

function persistentBattlePokemon(pokemon: BattlePokemon): BattlePokemon {
  const clean = normalizeBattlePokemonAbility(withoutBattleBoosts(pokemon));
  return { ...clean, currentHp: getMaxHp(clean) };
}
