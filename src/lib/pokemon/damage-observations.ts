import { championsNatures, getNatureModifiers } from "@/lib/pokemon/champions-data";
import {
  buildOpponentPreset,
  calculateDamage,
  getMaxHp,
  getMoveInfo,
  type BattleFieldState,
  type BattlePokemon,
  type BattleSide
} from "@/lib/pokemon/damage-calculation";
import { pokemonStatIds } from "@/lib/pokemon/team-stats";
import type { PokemonNature, PokemonSpread, TeamMember } from "@/lib/pokemon/types";

export type DamageObservation = {
  id: string;
  opponentId: string;
  own: BattlePokemon;
  opponent: BattlePokemon;
  attackerSide: BattleSide;
  move: string;
  damage: number;
  unit: "percent" | "hp";
  temporaryBattleState?: boolean;
  field: BattleFieldState;
};

export type OpponentEstimate = {
  member: TeamMember;
  matched: number;
  total: number;
};

const evValues = [0, 8, 16, 24, 32];
type Candidate = { evs: PokemonSpread; nature: PokemonNature; score: number; matched: number };

export function estimateOpponentSet(opponent: BattlePokemon, observations: DamageObservation[]): OpponentEstimate | null {
  const relevant = observations.filter((observation) => observation.opponentId === opponent.id);
  if (!relevant.length) return null;

  const baseline = opponent.member;
  const physical = baseline.moves.some((move) => getMoveInfo(move)?.category === "Physical");
  const special = baseline.moves.some((move) => getMoveInfo(move)?.category === "Special");
  const natureCandidates = (championsNatures as PokemonNature[]).filter((nature) => {
    const minus = getNatureModifiers(nature).minus;
    if (physical && special) return minus === "spe";
    if (physical) return minus !== "atk";
    if (special) return minus !== "spa";
    return true;
  });
  const priority: (typeof pokemonStatIds)[number][] = physical && special
    ? ["hp", "atk", "spa", "def", "spd", "spe"]
    : physical ? ["hp", "atk", "spe", "def", "spd", "spa"] : special
      ? ["hp", "spa", "spe", "def", "spd", "atk"] : ["hp", "def", "spd", "spe", "atk", "spa"];
  const seeds: PokemonSpread[] = [baseline.evs, {}];
  for (const strategy of ["bulky", "fast", "offensive"] as const) {
    const variants = strategy === "bulky" ? ["physically", "specially", "balanced"] as const : ["min", "medium"] as const;
    for (const variant of variants) seeds.push(buildOpponentPreset(baseline, opponent.forme, strategy, variant).evs);
  }

  const scored = new Map<string, Candidate>();
  let best: Candidate | null = null;
  const evaluate = (evs: PokemonSpread, nature: PokemonNature) => {
    const normalized = normalizeEvs(evs, priority);
    const key = `${nature}:${pokemonStatIds.map((stat) => normalized[stat]).join(",")}`;
    const cached = scored.get(key);
    if (cached) return cached;
    const member = { ...baseline, evs: normalized, nature };
    let score = 0;
    let matched = 0;
    for (const observation of relevant) {
      const candidate = { ...observation.opponent, member };
      const result = observation.attackerSide === "own"
        ? calculateDamage(observation.own, candidate, observation.move, "own", observation.field, { details: false })
        : calculateDamage(candidate, observation.own, observation.move, "opponent", observation.field, { details: false });
      if (!result) continue;
      const observedRolls = result.rolls.map((roll) => observation.attackerSide === "own"
        ? Math.round(Math.min(roll, observation.opponent.currentHp) / getMaxHp(candidate) * 1000) / 10
        : Math.min(roll, observation.own.currentHp));
      const minimum = Math.min(...observedRolls);
      const maximum = Math.max(...observedRolls);
      if (observedRolls.includes(observation.damage)) {
        matched += 1;
      } else if (observation.damage >= minimum && observation.damage <= maximum) {
        matched += 1;
        score += 0.1;
      } else {
        score += 1 + Math.min(Math.abs(observation.damage - minimum), Math.abs(observation.damage - maximum)) / Math.max(1, observation.damage);
      }
    }
    score += pokemonStatIds.reduce((penalty, stat) => penalty + Math.abs((normalized[stat] ?? 0) - (baseline.evs[stat] ?? 0)), 0) / 320;
    if (nature !== baseline.nature) score += 0.04;
    const candidate = { evs: normalized, nature, score, matched };
    scored.set(key, candidate);
    if (!best || score < best.score) best = candidate;
    return candidate;
  };

  for (const seed of seeds) {
    for (const nature of natureCandidates) evaluate(seed, nature);
  }

  const starters = [...scored.values()].sort((left, right) => left.score - right.score).slice(0, 8);
  for (const starter of starters) {
    let current = starter;
    for (let round = 0; round < 3; round += 1) {
      const before = current;
      for (const stat of pokemonStatIds) {
        for (const value of evValues) {
          const next = evaluate(withEv(current.evs, stat, value, priority), current.nature);
          if (next && next.score < current.score) current = next;
        }
      }
      if (current === before) break;
    }
  }

  const winner = [...scored.values()].sort((left, right) => left.score - right.score)[0];
  if (!winner) return null;
  return { member: { ...baseline, evs: winner.evs, nature: winner.nature }, matched: winner.matched, total: relevant.length };
}

function normalizeEvs(evs: PokemonSpread, priority: (typeof pokemonStatIds)[number][], fixed?: (typeof pokemonStatIds)[number]): PokemonSpread {
  const next: PokemonSpread = Object.fromEntries(pokemonStatIds.map((stat) => [stat, Math.max(0, Math.min(32, Math.round(evs[stat] ?? 0)))]));
  let difference = 66 - pokemonStatIds.reduce((total, stat) => total + (next[stat] ?? 0), 0);
  const ordered = priority.filter((stat) => stat !== fixed);
  if (difference > 0) {
    for (const stat of ordered) {
      const increase = Math.min(difference, 32 - (next[stat] ?? 0));
      next[stat] = (next[stat] ?? 0) + increase;
      difference -= increase;
      if (!difference) break;
    }
  } else if (difference < 0) {
    for (const stat of [...ordered].reverse()) {
      const decrease = Math.min(-difference, next[stat] ?? 0);
      next[stat] = (next[stat] ?? 0) - decrease;
      difference += decrease;
      if (!difference) break;
    }
  }
  return next;
}

function withEv(evs: PokemonSpread, changedStat: (typeof pokemonStatIds)[number], value: number, priority: (typeof pokemonStatIds)[number][]) {
  const next = { ...evs };
  next[changedStat] = value;
  return normalizeEvs(next, priority, changedStat);
}
