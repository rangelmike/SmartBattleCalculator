import { useState } from "react";
import { FileText, Link, RotateCcw, Upload } from "lucide-react";
import type { BattleFieldState, BattleSide, FieldSideState } from "@/lib/pokemon/damage-calculation";

const sideConditions: { key: Exclude<keyof FieldSideState, "spikes">; label: string }[] = [
  { key: "protect", label: "Protect" },
  { key: "helpingHand", label: "Helping Hand" },
  { key: "auroraVeil", label: "Aurora Veil" },
  { key: "reflect", label: "Reflect" },
  { key: "lightScreen", label: "Light Screen" },
  { key: "tailwind", label: "Tailwind" },
  { key: "leechSeed", label: "Leech Seed" },
  { key: "friendGuard", label: "Friend Guard" },
  { key: "stealthRock", label: "Stealth Rock" },
  { key: "steelySpirit", label: "Steely Spirit" },
  { key: "saltCure", label: "Salt Cure" },
  { key: "ingrain", label: "Ingrain" },
  { key: "curse", label: "Curse" },
  { key: "binding", label: "Binding" },
  { key: "charge", label: "Charge" },
  { key: "aquaRing", label: "Aqua Ring" }
];

type Props = {
  field: BattleFieldState;
  onChange: (field: BattleFieldState) => void;
  onNewBattle: () => void;
  onImport: (side: BattleSide, value: string, method: "text" | "pokepaste") => Promise<void>;
};

export function CalculatorFieldPanel({ field, onChange, onNewBattle, onImport }: Props) {
  const [importMethod, setImportMethod] = useState<"text" | "pokepaste">("text");
  const [paste, setPaste] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function changeSide(side: BattleSide, patch: Partial<FieldSideState>) {
    onChange({ ...field, [side]: { ...field[side], ...patch } });
  }

  async function importTeam(side: BattleSide) {
    setIsImporting(true);
    setError(null);
    setMessage(null);
    try {
      await onImport(side, paste, importMethod);
      setMessage(`Team loaded into ${side === "own" ? "My Team" : "Opponent Team"}.`);
      setPaste("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import team.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="min-w-0 border-y border-border py-5 xl:border-x xl:border-y-0 xl:px-5 xl:py-0" aria-label="Field">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Field</h2>
        <button className="flex h-9 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold hover:bg-secondary" type="button" onClick={onNewBattle}><RotateCcw className="h-3.5 w-3.5" /> New battle</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <FieldSelect label="Battle" value={field.gameType} choices={["Singles", "Doubles"]} onChange={(value) => onChange({ ...field, gameType: value as BattleFieldState["gameType"] })} />
        <FieldSelect label="Terrain" value={field.terrain} choices={["", "Electric", "Grassy", "Misty", "Psychic"]} onChange={(value) => onChange({ ...field, terrain: value as BattleFieldState["terrain"] })} />
        <FieldSelect label="Weather" value={field.weather} choices={["", "Sun", "Rain", "Sand", "Snow"]} onChange={(value) => onChange({ ...field, weather: value as BattleFieldState["weather"] })} />
        <div className="grid content-center gap-1.5 pt-4">
          <Check label="Fairy Aura" checked={field.fairyAura} onChange={(checked) => onChange({ ...field, fairyAura: checked })} />
          <Check label="Gravity" checked={field.gravity} onChange={(checked) => onChange({ ...field, gravity: checked })} />
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Side conditions</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["own", "opponent"] as const).map((side) => (
            <div key={side} className="min-w-0">
              <p className="mb-2 border-b border-border pb-1 text-xs font-semibold">{side === "own" ? "My Team" : "Opponent"}</p>
              <div className="grid gap-1.5">
                {sideConditions.map(({ key, label }) => <Check key={key} label={label} checked={field[side][key]} onChange={(checked) => changeSide(side, { [key]: checked })} />)}
                <label className="flex items-center justify-between gap-1 text-xs">Spikes
                  <select className="h-7 rounded border border-input bg-background px-1 text-xs" value={field[side].spikes} onChange={(event) => changeSide(side, { spikes: Number(event.target.value) })}>
                    {[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Import team</h3>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          <button className={modeClass(importMethod === "text")} type="button" onClick={() => setImportMethod("text")}><FileText className="h-3.5 w-3.5" /> Text</button>
          <button className={modeClass(importMethod === "pokepaste")} type="button" onClick={() => setImportMethod("pokepaste")}><Link className="h-3.5 w-3.5" /> Pokepaste</button>
        </div>
        {importMethod === "text" ? (
          <textarea className="mt-2 min-h-32 w-full resize-y rounded-md border border-input bg-background p-2 text-xs outline-none focus:border-primary" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Paste a Showdown team" aria-label="Team text" />
        ) : (
          <input className="mt-2 h-10 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="https://pokepast.es/..." type="url" aria-label="Pokepaste link" />
        )}
        {error ? <p className="mt-1 text-xs text-destructive" role="alert">{error}</p> : null}
        {message ? <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300" role="status">{message}</p> : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50" type="button" disabled={!paste.trim() || isImporting} onClick={() => void importTeam("own")}><Upload className="h-3.5 w-3.5" /> My Team</button>
          <button className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50" type="button" disabled={!paste.trim() || isImporting} onClick={() => void importTeam("opponent")}><Upload className="h-3.5 w-3.5" /> Opponent</button>
        </div>
      </div>
    </section>
  );
}

function FieldSelect({ label, value, choices, onChange }: { label: string; value: string; choices: string[]; onChange: (value: string) => void }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium">{label}<select className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>{choices.map((choice) => <option key={choice} value={choice}>{choice || "None"}</option>)}</select></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-xs"><input className="h-3.5 w-3.5 shrink-0 accent-primary" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="truncate" title={label}>{label}</span></label>;
}

function modeClass(active: boolean) {
  return `flex h-8 items-center justify-center gap-1 rounded text-xs font-semibold ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
}
