import { CalculatorWorkspace } from "@/features/calculator/CalculatorWorkspace";
import type { AppProfile } from "@/lib/supabase/auth";

export function CalculatorPage({ profile }: { profile: AppProfile }) {
  return <CalculatorWorkspace profile={profile} />;
}
