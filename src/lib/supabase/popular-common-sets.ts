import type { PokemonSpread } from "@/lib/pokemon/types";
import { supabase } from "@/lib/supabase/client";

export type PopularPokemonCommonSet = {
  species: string;
  sampleSize: number;
  moves: string[];
  item: string;
  ability: string;
  evs: PokemonSpread;
  nature: string;
  updatedAt: string;
};

export async function getPopularPokemonCommonSet(species: string): Promise<PopularPokemonCommonSet | null> {
  if (!supabase) throw new Error("Popular Pokemon sets require a Supabase connection.");
  const { data, error } = await supabase
    .from("popular_pokemon_common_sets")
    .select("species,sample_size,moves,item,ability,evs,nature,updated_at")
    .eq("species", species)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    species: data.species,
    sampleSize: data.sample_size,
    moves: data.moves,
    item: data.item,
    ability: data.ability,
    evs: data.evs as PokemonSpread,
    nature: data.nature,
    updatedAt: data.updated_at
  };
}
