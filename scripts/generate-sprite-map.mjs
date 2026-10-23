import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { Dex } from "@pkmn/dex";
import { Generations, toID } from "@smogon/calc";

const directoryUrl = "https://api.github.com/repos/PokeAPI/sprites/contents/sprites/pokemon/versions/generation-ix/champions";
const catalogUrl = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv";
const outputUrl = new URL("../src/lib/pokemon/champions-sprites.json", import.meta.url);

/** @param {string} url */
async function read(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}: ${response.status}`);
  return response;
}

const [index, catalog] = await Promise.all([read(directoryUrl), read(catalogUrl)]);
const spriteIndex = z.array(z.object({ name: z.string() })).parse(await index.json());
const files = new Set(spriteIndex.map((entry) => entry.name));
const rows = (await catalog.text()).trim().split("\n").slice(1).map((line) => line.trim().split(","));
const ids = new Map(rows.map(([id, name]) => [toID(name), id]));
const defaults = new Map(rows.filter((row) => row[7] === "1").map(([id, , speciesId]) => [Number(speciesId), id]));
// Showdown and PokeAPI use different names for these battle/cosmetic forms.
const aliases = new Map([
  ["aegislashboth", "aegislashshield"],
  ["basculegionf", "basculegionfemale"],
  ["indeedeef", "indeedeefemale"],
  ["mausholdfour", "mausholdfamilyoffour"],
  ["meowsticf", "meowsticfemale"],
  ["meowsticfmega", "meowsticfemalemega"],
  ["meowsticmmega", "meowsticmalemega"],
  ["squawkabillyblue", "squawkabillyblueplumage"],
  ["squawkabillywhite", "squawkabillywhiteplumage"],
  ["squawkabillyyellow", "squawkabillyyellowplumage"],
  ["taurospaldeaaqua", "taurospaldeaaquabreed"],
  ["taurospaldeablaze", "taurospaldeablazebreed"],
  ["taurospaldeacombat", "taurospaldeacombatbreed"]
]);
const overrides = new Map([
  ["polteageistantique", "855-antique.webp"],
  ["sinistchamasterpiece", "1013-masterpiece.webp"],
  ["vivillonfancy", "666-fancy.webp"],
  ["vivillonpokeball", "666-poke-ball.webp"]
]);

const entries = [...Generations.get(0).species].map((species) => {
  const id = ids.get(aliases.get(species.id) ?? species.id) ?? (species.baseSpecies ? undefined : defaults.get(Dex.species.get(species.name).num));
  const file = overrides.get(species.id) ?? `${id}.webp`;
  if (!files.has(file)) throw new Error(`No verified Champions sprite for ${species.name} (${file})`);
  return [species.id, file];
}).sort(([left], [right]) => left.localeCompare(right, "en"));

await writeFile(outputUrl, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`);
console.log(`Verified ${entries.length} Champions species against PokeAPI Champions WebPs.`);
