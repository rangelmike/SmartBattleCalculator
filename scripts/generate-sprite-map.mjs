import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { Generations, toID } from "@smogon/calc";

const directoryUrl = "https://play.pokemonshowdown.com/sprites/ani/";
const outputUrl = new URL("../src/lib/pokemon/champions-sprites.json", import.meta.url);
const response = await fetch(directoryUrl);
if (!response.ok) throw new Error(`Could not read sprite index: ${response.status}`);

const document = new JSDOM(await response.text()).window.document;
const files = [...document.querySelectorAll("a[href]")]
  .map((link) => new URL(link.getAttribute("href"), directoryUrl))
  .filter((url) => url.origin === new URL(directoryUrl).origin && url.pathname.startsWith("/sprites/ani/") && url.pathname.endsWith(".gif"))
  .map((url) => decodeURIComponent(url.pathname.split("/").at(-1)));
const fileSet = new Set(files);
const filesById = new Map(files.map((file) => [toID(file.slice(0, -4)), file]));
const overrides = new Map([
  ["aegislashboth", "aegislash.gif"],
  ["aegislashshield", "aegislash.gif"]
]);

/** @param {string} name */
function findFile(name) {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.gif`;
  return fileSet.has(slug) ? slug : filesById.get(toID(name));
}

const entries = [...Generations.get(0).species]
  .map((species) => {
    const file = overrides.get(species.id) ?? findFile(species.name) ?? findFile(species.baseSpecies);
    if (!file || !fileSet.has(file)) throw new Error(`No verified GIF for ${species.name}`);
    return [species.id, file];
  })
  .sort(([left], [right]) => left.localeCompare(right, "en"));

await writeFile(outputUrl, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`);
console.log(`Verified ${entries.length} Champions species against ${fileSet.size} Showdown GIFs.`);
