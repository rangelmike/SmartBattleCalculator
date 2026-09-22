export type PokemonNature =
  | "Hardy"
  | "Lonely"
  | "Brave"
  | "Adamant"
  | "Naughty"
  | "Bold"
  | "Docile"
  | "Relaxed"
  | "Impish"
  | "Lax"
  | "Timid"
  | "Hasty"
  | "Serious"
  | "Jolly"
  | "Naive"
  | "Modest"
  | "Mild"
  | "Quiet"
  | "Bashful"
  | "Rash"
  | "Calm"
  | "Gentle"
  | "Sassy"
  | "Careful"
  | "Quirky";

export type PokemonStatId = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export type PokemonSpread = Partial<Record<PokemonStatId, number>>;

export type TeamMember = {
  name: string;
  species: string;
  item?: string;
  ability?: string;
  level: number;
  teraType?: string;
  nature?: PokemonNature;
  evs: PokemonSpread;
  ivs: PokemonSpread;
  moves: string[];
};

export type PokemonTeam = {
  format: string;
  members: TeamMember[];
};
