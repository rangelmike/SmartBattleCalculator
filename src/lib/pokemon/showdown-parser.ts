import type { PokemonSpread, PokemonTeam, TeamMember } from "@/lib/pokemon/types";

const statMap: Record<string, keyof PokemonSpread> = {
  HP: "hp",
  Atk: "atk",
  Def: "def",
  SpA: "spa",
  SpD: "spd",
  Spe: "spe"
};

export function parseShowdownPaste(pasteText: string, format = "vgc"): PokemonTeam {
  const blocks = pasteText
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const members = blocks.map(parsePokemonBlock);

  if (members.length > 6) {
    throw new Error("Un equipo no puede tener mas de 6 Pokemon.");
  }

  return { format, members };
}

function parsePokemonBlock(block: string): TeamMember {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const header = lines[0] ?? "";
  const itemSplit = header.split(" @ ");
  const identity = itemSplit[0]?.trim() ?? "";
  const speciesMatch = identity.match(/\(([^)]+)\)/);
  const species = speciesMatch?.[1] ?? identity;

  const member: TeamMember = {
    name: speciesMatch ? identity.replace(/\s*\([^)]+\)/, "").trim() : species,
    species,
    item: itemSplit[1]?.trim(),
    level: 50,
    evs: {},
    ivs: {},
    moves: []
  };

  for (const line of lines.slice(1)) {
    if (line.startsWith("Ability: ")) member.ability = line.replace("Ability: ", "").trim();
    else if (line.startsWith("Level: ")) member.level = Number(line.replace("Level: ", "").trim());
    else if (line.startsWith("Tera Type: ")) member.teraType = line.replace("Tera Type: ", "").trim();
    else if (line.endsWith(" Nature")) member.nature = line.replace(" Nature", "").trim() as TeamMember["nature"];
    else if (line.startsWith("EVs: ")) member.evs = parseSpread(line.replace("EVs: ", ""));
    else if (line.startsWith("IVs: ")) member.ivs = parseSpread(line.replace("IVs: ", ""));
    else if (line.startsWith("- ")) member.moves.push(line.replace("- ", "").trim());
  }

  return member;
}

function parseSpread(spreadText: string): PokemonSpread {
  return Object.fromEntries(
    spreadText.split("/").map((part) => {
      const match = part.trim().match(/^(\d+)\s+(\w+)$/);
      if (!match) return ["hp", 0];
      return [statMap[match[2]] ?? "hp", Number(match[1])];
    })
  );
}
