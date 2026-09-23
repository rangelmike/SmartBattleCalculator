import type { BattleBoosts, BattlePokemon, BattleSide, BoostableStat } from "@/lib/pokemon/damage-calculation";

export type BattleBoostState = Record<string, BattleBoosts>;

export function battleBoostKey(side: BattleSide, id: string) {
  return `${side}:${id}`;
}

export function setBattleBoost(state: BattleBoostState, side: BattleSide, id: string, stat: BoostableStat, stage: number): BattleBoostState {
  if (!Number.isInteger(stage) || stage < -6 || stage > 6) return state;
  const key = battleBoostKey(side, id);
  const next = { ...state };
  const boosts = { ...next[key] };
  if (stage === 0) delete boosts[stat];
  else boosts[stat] = stage;
  if (Object.keys(boosts).length) next[key] = boosts;
  else delete next[key];
  return next;
}

export function clearBattleBoost(state: BattleBoostState, side: BattleSide, id: string): BattleBoostState {
  const next = { ...state };
  delete next[battleBoostKey(side, id)];
  return next;
}

export function clearSideBattleBoosts(state: BattleBoostState, side: BattleSide): BattleBoostState {
  return Object.fromEntries(Object.entries(state).filter(([key]) => !key.startsWith(`${side}:`)));
}

export function withBattleBoosts(pokemon: BattlePokemon, boosts: BattleBoosts | undefined): BattlePokemon {
  return boosts ? { ...pokemon, boosts } : pokemon;
}

export function withoutBattleBoosts(pokemon: BattlePokemon): BattlePokemon {
  if (!pokemon.boosts) return pokemon;
  const persistent = { ...pokemon };
  delete persistent.boosts;
  return persistent;
}

export function hasBattleBoosts(pokemon: BattlePokemon): boolean {
  return Object.values(pokemon.boosts ?? {}).some((stage) => stage !== 0);
}

export function getBoostedStat(stat: number, stage: number): number {
  return Math.floor(stat * (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)));
}
