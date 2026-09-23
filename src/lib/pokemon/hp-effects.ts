import { toID, type Move, type Pokemon } from "@smogon/calc";
import { Dex } from "@pkmn/dex";
import type { Result } from "@smogon/calc";
import type { BattleFieldState, FieldSideState } from "@/lib/pokemon/damage-calculation";

type EndTurnEffect = { change: number; recoverySources: string[] };
export type MoveHpEffect = { minPercent: number; maxPercent: number; timing?: "next turn" };

export function getMoveHpEffects(result: Result, field: BattleFieldState): {
  healing?: MoveHpEffect;
  recoil?: MoveHpEffect;
} {
  const { attacker, defender, move } = result;
  const maxHp = attacker.maxHP();
  if (move.category === "Status") {
    const dexMove = Dex.moves.get(toID(move.name));
    let healed = 0;
    let timing: MoveHpEffect["timing"];
    if (dexMove.heal && (dexMove.target === "self" || dexMove.target === "allies")) {
      healed = Math.floor(maxHp * dexMove.heal[0] / dexMove.heal[1]);
    } else if (["synthesis", "moonlight", "morningsun"].includes(toID(move.name))) {
      healed = Math.floor(maxHp * (field.weather === "Sun" ? 2 / 3 : field.weather ? 1 / 4 : 1 / 2));
    } else if (move.named("Rest")) {
      healed = maxHp;
    } else if (move.named("Wish")) {
      healed = Math.floor(maxHp / 2);
      timing = "next turn";
    } else if (move.named("Strength Sap")) {
      const stage = defender.boosts.atk;
      const attack = Math.floor(defender.stats.atk * (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)));
      healed = Math.min(maxHp, attack);
    }
    return healed > 0 ? { healing: { minPercent: percent(healed, maxHp), maxPercent: percent(healed, maxHp), timing } } : {};
  }

  const [minHeal, maxHeal] = result.recovery().recovery;
  const hpChange = maxHeal > 0 ? { minPercent: percent(minHeal, maxHp), maxPercent: percent(maxHeal, maxHp) } : undefined;
  let healing = hpChange;
  let recoil: MoveHpEffect | undefined;
  if (move.drain && defender.hasAbility("Liquid Ooze")) {
    recoil = hpChange;
    healing = undefined;
  }
  if (move.mindBlownRecoil) recoil = { minPercent: 50, maxPercent: 50 };
  else if (move.struggleRecoil) recoil = { minPercent: 25, maxPercent: 25 };
  else if (move.recoil && !attacker.hasAbility("Magic Guard")) {
    const amount = result.recoil("%").recoil;
    if (Array.isArray(amount) && amount[1] > 0) recoil = { minPercent: amount[0], maxPercent: amount[1] };
  }
  return { healing, recoil };
}

export function getEndTurnHpEffect(
  pokemon: Pokemon, side: FieldSideState, field: BattleFieldState,
  moveName = "", attacker?: Pokemon, turn = 1
): EndTurnEffect {
  const hp = pokemon.maxHP();
  const magicGuard = pokemon.hasAbility("Magic Guard");
  const itemActive = !pokemon.hasAbility("Klutz") && !(toID(moveName) === "knockoff" && !pokemon.hasAbility("Sticky Hold"));
  const healingBlocked = toID(moveName) === "psychicnoise";
  const sources: string[] = [];
  let change = 0;
  const recover = (amount: number, source: string) => {
    if (healingBlocked || amount <= 0) return;
    change += amount;
    sources.push(source);
  };
  const lose = (amount: number) => { if (!magicGuard) change -= amount; };

  if (side.leechSeed) lose(Math.floor(hp / 8));
  if (side.saltCure) lose(Math.floor(hp / (pokemon.hasType("Water", "Steel") ? 4 : 8)));
  if (side.curse) lose(Math.floor(hp / 4));
  if (side.binding) lose(Math.floor(hp / 8));
  const rootMultiplier = itemActive && pokemon.hasItem("Big Root") ? 5324 / 4096 : 1;
  if (side.ingrain) recover(Math.floor(Math.floor(hp / 16) * rootMultiplier), "Ingrain");
  if (side.aquaRing) recover(Math.floor(Math.floor(hp / 16) * rootMultiplier), "Aqua Ring");

  if (field.weather === "Rain") {
    if (pokemon.hasAbility("Dry Skin")) recover(Math.floor(hp / 8), "Dry Skin");
    else if (pokemon.hasAbility("Rain Dish")) recover(Math.floor(hp / 16), "Rain Dish");
  } else if (field.weather === "Sun" && pokemon.hasAbility("Dry Skin", "Solar Power")) {
    lose(Math.floor(hp / 8));
  } else if (field.weather === "Snow" && pokemon.hasAbility("Ice Body")) {
    recover(Math.floor(hp / 16), "Ice Body");
  } else if (field.weather === "Sand" && !pokemon.hasType("Rock", "Ground", "Steel") &&
    !pokemon.hasAbility("Overcoat", "Sand Force", "Sand Rush", "Sand Veil") &&
    !(itemActive && pokemon.hasItem("Safety Goggles"))) {
    lose(Math.floor(hp / 16));
  }

  if (itemActive && pokemon.hasItem("Leftovers")) recover(Math.floor(hp / 16), "Leftovers");
  if (itemActive && pokemon.hasItem("Black Sludge")) {
    if (pokemon.hasType("Poison")) recover(Math.floor(hp / 16), "Black Sludge");
    else lose(Math.floor(hp / 8));
  }
  if (itemActive && pokemon.hasItem("Sticky Barb")) lose(Math.floor(hp / 8));
  if (field.terrain === "Grassy" && isGrounded(pokemon, field, itemActive)) recover(Math.floor(hp / 16), "Grassy Terrain");

  if (pokemon.hasStatus("psn", "tox")) {
    if (pokemon.hasAbility("Poison Heal")) recover(Math.floor(hp / 8), "Poison Heal");
    else lose(Math.floor(hp * (pokemon.hasStatus("tox") ? Math.min(turn, 15) / 16 : 1 / 8)));
  } else if (pokemon.hasStatus("brn")) {
    lose(Math.floor(hp / (pokemon.hasAbility("Heatproof") ? 32 : 16)));
  }
  if (attacker?.hasAbility("Bad Dreams") && pokemon.hasStatus("slp")) lose(Math.floor(hp / 8));

  return { change, recoverySources: sources };
}

export function recoveryAwareKoChance(
  rolls: number[], attacker: Pokemon, defender: Pokemon, move: Move,
  field: BattleFieldState, side: FieldSideState
): string | null {
  const itemRemoved = toID(move.name) === "knockoff" && !defender.hasAbility("Sticky Hold");
  const sitrus = defender.hasItem("Sitrus Berry") && !defender.hasAbility("Klutz") &&
    !attacker.hasAbility("Unnerve") && !itemRemoved && toID(move.name) !== "psychicnoise";
  const endTurn = getEndTurnHpEffect(defender, side, field, move.name, attacker);
  if (!sitrus && endTurn.recoverySources.length === 0) return null;

  const sources = [...new Set([...(sitrus ? ["Sitrus Berry"] : []), ...endTurn.recoverySources])];
  const suffix = ` after ${sources.join(" + ")} recovery`;
  const maxHp = defender.maxHP();
  const berryHeal = Math.floor(maxHp / 4) * (defender.hasAbility("Ripen") ? 2 : 1);
  const initialHp = Math.max(1, defender.curHP() - entryHazardDamage(defender, side, field));
  let states = new Map<number, number>([[initialHp * 2 + Number(sitrus), 1]]);

  for (let hit = 1; hit <= 30; hit++) {
    const next = new Map<number, number>();
    const residual = getEndTurnHpEffect(defender, side, field, move.name, attacker, hit).change;
    let koChance = 0;
    for (const [key, probability] of states) {
      const hp = Math.floor(key / 2);
      const berryAvailable = key % 2 === 1;
      for (const damage of rolls) {
        const chance = probability / rolls.length;
        let remaining = hp - damage;
        if (remaining <= 0) { koChance += chance; continue; }
        let berry = berryAvailable;
        if (berry && remaining <= maxHp / 2) {
          remaining = Math.min(maxHp, remaining + berryHeal);
          berry = false;
        }
        remaining = Math.min(maxHp, remaining + residual);
        if (remaining <= 0) { koChance += chance; continue; }
        const nextKey = remaining * 2 + Number(berry);
        next.set(nextKey, (next.get(nextKey) ?? 0) + chance);
      }
    }
    if (koChance > 0) {
      const knockout = hit === 1 ? "OHKO" : `${hit}HKO`;
      if (koChance >= 1 - 1e-9) return `guaranteed ${knockout}${suffix}`;
      const percent = Math.round(koChance * 1000) / 10;
      return `${percent > 0 ? `${percent}%` : "<0.1%"} chance to ${knockout}${suffix}`;
    }
    states = next;
  }
  return `no KO within 30 hits${suffix}`;
}

function isGrounded(pokemon: Pokemon, field: BattleFieldState, itemActive: boolean) {
  return field.gravity || (itemActive && pokemon.hasItem("Iron Ball")) ||
    (!pokemon.hasType("Flying") && !pokemon.hasAbility("Levitate") && !(itemActive && pokemon.hasItem("Air Balloon")));
}

function entryHazardDamage(pokemon: Pokemon, side: FieldSideState, field: BattleFieldState) {
  if (pokemon.hasItem("Heavy-Duty Boots") || pokemon.hasAbility("Magic Guard")) return 0;
  const hp = pokemon.maxHP();
  let damage = 0;
  if (side.stealthRock && !pokemon.hasAbility("Mountaineer")) {
    const rock = pokemon.gen.types.get(toID("Rock"));
    const effectiveness = pokemon.types.reduce<number>((total, type) => total * (rock?.effectiveness[type] ?? 1), 1);
    damage += Math.max(1, Math.floor(hp * effectiveness / 8));
  }
  if (side.spikes && isGrounded(pokemon, field, true)) {
    damage += Math.floor(hp / (side.spikes === 1 ? 8 : side.spikes === 2 ? 6 : 4));
  }
  return damage;
}

function percent(amount: number, maxHp: number) {
  return Math.round(amount / Math.max(1, maxHp) * 1000) / 10;
}
