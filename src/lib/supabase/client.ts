import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export const supabase =
  clientEnv.VITE_SUPABASE_URL && clientEnv.VITE_SUPABASE_ANON_KEY
    ? createClient<Database>(clientEnv.VITE_SUPABASE_URL, clientEnv.VITE_SUPABASE_ANON_KEY)
    : null;
