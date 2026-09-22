export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          paste_url?: string | null;
          paste_text?: string;
          team_json?: Json;
          team_hash?: string;
          is_public?: boolean;
          updated_at?: string;
        };
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
        Update: never;
      };
    };
  };
};
