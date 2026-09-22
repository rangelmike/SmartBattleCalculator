export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PopularTeamRow = {
  id: string;
  created_by: string;
  name: string;
  source: string;
  format: string;
  paste_url: string | null;
  paste_text: string;
  team_json: Json;
  team_hash: string;
  species_names: string[];
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          format: string;
          source: string;
          paste_url: string | null;
          paste_text: string;
          team_json: Json;
          team_hash: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          format?: string;
          source?: string;
          paste_url?: string | null;
          paste_text: string;
          team_json: Json;
          team_hash: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          format?: string;
          source?: string;
          paste_url?: string | null;
          paste_text?: string;
          team_json?: Json;
          team_hash?: string;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      popular_teams: {
        Row: PopularTeamRow;
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          source: string;
          format?: string;
          paste_url?: string | null;
          paste_text: string;
          team_json: Json;
          team_hash: string;
          species_names: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          source?: string;
          format?: string;
          paste_url?: string | null;
          paste_text?: string;
          team_json?: Json;
          team_hash?: string;
          species_names?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      team_collections: {
        Row: {
          user_id: string;
          team_id: string;
          list_kind: "own" | "opponent";
          created_at: string;
        };
        Insert: {
          user_id: string;
          team_id: string;
          list_kind: "own" | "opponent";
          created_at?: string;
        };
        Update: {
          list_kind?: "own" | "opponent";
        };
        Relationships: [];
      };
      ai_recommendation_cache: {
        Row: {
          id: string;
          format: string;
          own_team_hash: string;
          opponent_team_hash: string;
          model: string;
          response_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          format: string;
          own_team_hash: string;
          opponent_team_hash: string;
          model: string;
          response_json: Json;
          created_at?: string;
        };
        Update: {
          response_json?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_popular_team_admin: { Args: Record<string, never>; Returns: boolean };
      search_popular_teams: {
        Args: { p_text?: string; p_pokemon?: string[]; p_limit?: number; p_offset?: number };
        Returns: PopularTeamRow[];
      };
      suggest_popular_teams: {
        Args: { p_kind: "source" | "pokemon"; p_prefix: string; p_excluded?: string[] };
        Returns: { name: string; team_count: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
