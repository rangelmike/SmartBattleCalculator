import { Calculator, Sparkles, UsersRound } from "lucide-react";

const nextMilestones = [
  {
    icon: Calculator,
    title: "Damage Calculator",
    text: "Motor con @smogon/calc, matriz de matchups y soporte VGC."
  },
  {
    icon: UsersRound,
    title: "Perfiles y equipos",
    text: "Supabase Auth, equipos de 6, Pokepaste y Row Level Security."
  },
  {
    icon: Sparkles,
    title: "Sugerencias IA",
    text: "Heuristica rapida + Gemini JSON + cache por hash de equipos."
  }
];

export function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-6">
          <p className="text-sm font-medium text-muted-foreground">Smart Battle Calculator</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                Base lista para construir la calculadora competitiva
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                React, Supabase, Smogon calc, Pokepaste e IA quedaron organizados para crecer sin
                mezclar responsabilidades.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {nextMilestones.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-card p-5">
              <item.icon aria-hidden className="mb-4 h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Primeros comandos</h2>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <code className="rounded-md bg-muted px-3 py-2 text-foreground">npm install</code>
            <code className="rounded-md bg-muted px-3 py-2 text-foreground">npm run dev</code>
            <code className="rounded-md bg-muted px-3 py-2 text-foreground">supabase start</code>
            <code className="rounded-md bg-muted px-3 py-2 text-foreground">npm run test</code>
          </div>
        </section>
      </section>
    </main>
  );
}
