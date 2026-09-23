import { getMaxHp, type BattlePokemon, type BattleSide } from "@/lib/pokemon/damage-calculation";

export type BattleHpState = Record<string, number>;

export function battleHpKey(side: BattleSide, id: string) {
  return `${side}:${id}`;
}

export function setBattleCurrentHp(state: BattleHpState, side: BattleSide, pokemon: BattlePokemon, value: number): BattleHpState {
  if (!Number.isFinite(value)) return state;
  const key = battleHpKey(side, pokemon.id);
  const maxHp = getMaxHp(pokemon);
  const fraction = Math.max(0, Math.min(maxHp, Math.round(value))) / maxHp;
  const next = { ...state };
  if (fraction === 1) delete next[key];
  else next[key] = fraction;
  return next;
}

export function withBattleCurrentHp(pokemon: BattlePokemon, fraction: number | undefined): BattlePokemon {
  return fraction === undefined ? pokemon : { ...pokemon, currentHp: Math.round(getMaxHp(pokemon) * fraction) };
}

export function clearBattleCurrentHp(state: BattleHpState, side: BattleSide, id: string): BattleHpState {
  const next = { ...state };
  delete next[battleHpKey(side, id)];
  return next;
}

export function clearSideBattleHp(state: BattleHpState, side: BattleSide): BattleHpState {
  return Object.fromEntries(Object.entries(state).filter(([key]) => !key.startsWith(`${side}:`)));
}
