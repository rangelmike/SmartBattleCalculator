import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Link,
  ListPlus,
  Plus,
  UserRound,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import { TeamEditorDialog, type TeamEditorDestination, type TeamEditorSubmission } from "@/features/teams/TeamEditorDialog";
import { FilterAutocomplete } from "@/features/teams/FilterAutocomplete";
import { TeamViewer } from "@/features/teams/TeamViewer";
import {
  buildSavedTeamFromEditor,
  buildSavedTeam,
  loadPokepasteText,
  updateSavedTeamFromEditor,
  type SavedTeam,
  type TeamImportMethod,
  type TeamLibrary
} from "@/lib/pokemon/team-import";
import {
  completePokemonTerm,
  filterTeams,
  getPokemonSuggestions,
  getSourceSuggestions,
  getTeamSources
} from "@/lib/pokemon/team-search";
import { updateProfileUsername, type AppProfile } from "@/lib/supabase/auth";
import {
  canManagePopularTeams,
  createPopularTeam,
  deletePopularTeam,
  searchPopularTeams,
  suggestPopularPokemon,
  suggestPopularSources,
  updatePopularTeam
} from "@/lib/supabase/popular-teams";
import {
  deleteTeamFromLibrary,
  loadTeamLibrary,
  saveTeamToLibrary,
  updateTeamInLibrary
} from "@/lib/supabase/teams";

type ProfilePageProps = {
  profile: AppProfile;
  onProfileUpdated: (profile: AppProfile) => void;
};

const emptyLibrary: TeamLibrary = { own: [], opponent: [] };
const newSourceValue = "__new_source__";

export function ProfilePage({ profile, onProfileUpdated }: ProfilePageProps) {
  const [username, setUsername] = useState(profile.username);
  const [library, setLibrary] = useState<TeamLibrary>(emptyLibrary);
  const [activeList, setActiveList] = useState<TeamEditorDestination>("own");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [pokemonFilter, setPokemonFilter] = useState("");
  const [destination, setDestination] = useState<TeamEditorDestination>("own");
  const [method, setMethod] = useState<TeamImportMethod>("text");
  const [teamName, setTeamName] = useState("");
  const [sourceChoice, setSourceChoice] = useState(newSourceValue);
  const [newSource, setNewSource] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTeam, setEditorTeam] = useState<SavedTeam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canManagePopular, setCanManagePopular] = useState(false);
  const [popularTeams, setPopularTeams] = useState<SavedTeam[]>([]);
  const [popularHasMore, setPopularHasMore] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [popularLoadError, setPopularLoadError] = useState<string | null>(null);
  const [popularRefresh, setPopularRefresh] = useState(0);
  const [editorCollection, setEditorCollection] = useState<TeamEditorDestination>("own");
  const popularRequest = useRef(0);

  useEffect(() => setUsername(profile.username), [profile.username]);

  useEffect(() => {
    let active = true;
    setCanManagePopular(false);
    void canManagePopularTeams()
      .then((allowed) => { if (active) setCanManagePopular(allowed); })
      .catch(() => { if (active) setCanManagePopular(false); });
    return () => { active = false; };
  }, [profile.id]);

  useEffect(() => {
    if (!canManagePopular && destination === "popular") setDestination("own");
  }, [canManagePopular, destination]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTeams(true);

    void loadTeamLibrary(profile.id)
      .then((nextLibrary) => {
        if (isMounted) setLibrary(nextLibrary);
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load teams.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  useEffect(() => {
    if (activeList !== "popular") return;
    const requestId = ++popularRequest.current;
    setPopularTeams([]);
    setPopularHasMore(false);
    setPopularLoadError(null);
    setIsLoadingPopular(true);
    const timer = window.setTimeout(() => {
      void searchPopularTeams({ text: searchText, pokemon: pokemonFilter })
        .then((result) => {
          if (popularRequest.current !== requestId) return;
          setPopularTeams(result.teams);
          setPopularHasMore(result.hasMore);
        })
        .catch((loadError) => {
          if (popularRequest.current === requestId) {
            setPopularLoadError(loadError instanceof Error ? loadError.message : "Could not load popular teams.");
          }
        })
        .finally(() => {
          if (popularRequest.current === requestId) setIsLoadingPopular(false);
        });
    }, searchText || pokemonFilter ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      popularRequest.current += 1;
    };
  }, [activeList, searchText, pokemonFilter, popularRefresh]);

  const sources = useMemo(() => getTeamSources({ own: [...library.own, ...popularTeams], opponent: library.opponent }), [library, popularTeams]);
  const totalTeams = useMemo(() => {
    return new Set([...library.own, ...library.opponent].map((team) => team.teamHash)).size;
  }, [library]);
  const visibleTeams = useMemo(
    () => activeList === "popular" ? popularTeams : filterTeams(library[activeList], { text: searchText, pokemon: pokemonFilter }),
    [activeList, library, pokemonFilter, popularTeams, searchText]
  );
  const selectedTeam = useMemo(
    () => visibleTeams.find((team) => team.id === selectedTeamId) ?? visibleTeams[0] ?? null,
    [selectedTeamId, visibleTeams]
  );

  async function loadMorePopularTeams() {
    if (activeList !== "popular" || !popularHasMore || isLoadingPopular) return;
    const requestId = popularRequest.current;
    setIsLoadingPopular(true);
    try {
      const result = await searchPopularTeams({ text: searchText, pokemon: pokemonFilter }, popularTeams.length);
      if (popularRequest.current !== requestId) return;
      setPopularTeams((current) => [...current, ...result.teams]);
      setPopularHasMore(result.hasMore);
    } catch (loadError) {
      if (popularRequest.current === requestId) {
        setPopularLoadError(loadError instanceof Error ? loadError.message : "Could not load more popular teams.");
      }
    } finally {
      if (popularRequest.current === requestId) setIsLoadingPopular(false);
    }
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSavingProfile(true);

    try {
      const updatedProfile = await updateProfileUsername(profile, username);
      onProfileUpdated(updatedProfile);
      setStatus("Username updated.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsImporting(true);

    try {
      const source = sourceChoice === newSourceValue ? newSource : sourceChoice;
      const resolvedPasteText = method === "pokepaste" ? await loadPokepasteText(pasteUrl) : pasteText;
      const team = await buildSavedTeam({
        ownerId: profile.id,
        name: teamName,
        source,
        pasteText: resolvedPasteText,
        pasteUrl: method === "pokepaste" ? pasteUrl : undefined,
        destination: destination === "popular" ? "own" : destination
      });
      if (destination === "popular") {
        if (!canManagePopular) throw new Error("Only the popular-team administrator can import here.");
        await createPopularTeam(team);
        setPopularRefresh((current) => current + 1);
      } else {
        const nextLibrary = await saveTeamToLibrary(profile.id, team, destination);
        setLibrary(nextLibrary);
      }
      setActiveList(destination);
      setSelectedTeamId(team.id);
      setTeamName("");
      setSourceChoice(team.source);
      setNewSource("");
      setPasteUrl("");
      setPasteText("");
      setStatus(destination === "popular"
        ? "Popular team imported."
        : destination === "own" ? "Team added to My teams and Opponent teams." : "Opponent team added.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import team.");
    } finally {
      setIsImporting(false);
    }
  }

  function openNewTeamEditor() {
    setEditorTeam(null);
    setEditorCollection(destination);
    setIsEditorOpen(true);
  }

  function openTeamEditor(team: SavedTeam) {
    setEditorTeam(team);
    setEditorCollection(activeList);
    setIsEditorOpen(true);
  }

  async function handleEditorSave(submission: TeamEditorSubmission) {
    setError(null);
    setStatus(null);

    if (editorTeam) {
      const updatedTeam = await updateSavedTeamFromEditor(editorTeam, submission);
      if (editorCollection === "popular") {
        if (!canManagePopular) throw new Error("Only the popular-team administrator can edit this team.");
        await updatePopularTeam(updatedTeam);
        setPopularRefresh((current) => current + 1);
      } else {
        const nextLibrary = await updateTeamInLibrary(profile.id, updatedTeam);
        setLibrary(nextLibrary);
      }
      setSelectedTeamId(updatedTeam.id);
      setStatus(editorCollection === "popular" ? "Popular team updated." : "Team updated and validated for Champions.");
      return;
    }

    const createdTeam = await buildSavedTeamFromEditor({
      ownerId: profile.id,
      name: submission.name,
      source: submission.source,
      destination: submission.destination === "popular" ? "own" : submission.destination,
      team: submission.team
    });
    if (submission.destination === "popular") {
      if (!canManagePopular) throw new Error("Only the popular-team administrator can create teams here.");
      await createPopularTeam(createdTeam);
      setPopularRefresh((current) => current + 1);
    } else {
      const nextLibrary = await saveTeamToLibrary(profile.id, createdTeam, submission.destination);
      setLibrary(nextLibrary);
    }
    setActiveList(submission.destination);
    setSelectedTeamId(createdTeam.id);
    setStatus(submission.destination === "popular"
      ? "Popular team created."
      : submission.destination === "own" ? "Team created in My teams and Opponent teams." : "Opponent team created.");
  }

  async function handleDeleteTeam(team: SavedTeam) {
    setError(null);
    setStatus(null);
    setIsDeleting(true);
    try {
      if (activeList === "popular") {
        if (!canManagePopular) throw new Error("Only the popular-team administrator can delete this team.");
        await deletePopularTeam(team.id);
        setPopularRefresh((current) => current + 1);
      } else {
        const nextLibrary = await deleteTeamFromLibrary(profile.id, team.id);
        setLibrary(nextLibrary);
      }
      setSelectedTeamId(null);
      setStatus(`${team.name} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete team.");
      throw deleteError;
    } finally {
      setIsDeleting(false);
    }
  }

  const hasFilters = Boolean(searchText || pokemonFilter);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <p className="text-sm font-semibold text-primary">Account and library</p>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and battle teams.</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{totalTeams} unique teams</p>
      </div>

      <div className="grid gap-8 border-b border-border py-8 lg:grid-cols-[320px_1fr]">
        <section>
          <SectionHeading icon={UserRound} title="Profile details" />
          <p className="mt-2 truncate text-sm text-muted-foreground">{profile.email}</p>
          <form onSubmit={(event) => void handleUsernameSubmit(event)} className="mt-5 grid gap-3">
            <FieldLabel label="Username">
              <input className={inputClassName} value={username} onChange={(event) => setUsername(event.target.value)} required />
            </FieldLabel>
            <button
              className="h-10 rounded-md bg-foreground px-3 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-60"
              type="submit"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading icon={Plus} title="Import team" />
            <button className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-secondary" type="button" onClick={openNewTeamEditor}>
              <ListPlus aria-hidden className="h-4 w-4" /> Create manually
            </button>
          </div>
          <form onSubmit={(event) => void handleTeamSubmit(event)} className="mt-5 grid gap-4 md:grid-cols-2">
            <div className={`grid gap-2 md:col-span-2 ${canManagePopular ? "grid-cols-3" : "grid-cols-2"}`}>
              <ToggleButton active={destination === "own"} onClick={() => setDestination("own")}>My teams</ToggleButton>
              <ToggleButton active={destination === "opponent"} onClick={() => setDestination("opponent")}>Opponent teams</ToggleButton>
              {canManagePopular ? <ToggleButton active={destination === "popular"} onClick={() => setDestination("popular")}>Popular teams</ToggleButton> : null}
            </div>

            <FieldLabel label="Team name">
              <input className={inputClassName} value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
            </FieldLabel>

            <FieldLabel label="Source">
              <select className={inputClassName} value={sourceChoice} onChange={(event) => setSourceChoice(event.target.value)}>
                {sources.map((source) => <option key={source} value={source}>{source}</option>)}
                <option value={newSourceValue}>New source...</option>
              </select>
            </FieldLabel>

            {sourceChoice === newSourceValue ? (
              <FieldLabel label="New source" className="md:col-start-2">
                <input
                  className={inputClassName}
                  value={newSource}
                  onChange={(event) => setNewSource(event.target.value)}
                  placeholder="Personal, tournament, ladder..."
                  required
                />
              </FieldLabel>
            ) : null}

            <div className="grid grid-cols-2 gap-2 md:col-span-2">
              <IconToggleButton active={method === "text"} icon={FileText} onClick={() => setMethod("text")}>Text</IconToggleButton>
              <IconToggleButton active={method === "pokepaste"} icon={Link} onClick={() => setMethod("pokepaste")}>Pokepaste</IconToggleButton>
            </div>

            {method === "pokepaste" ? (
              <FieldLabel label="Pokepaste link" className="md:col-span-2">
                <input
                  className={inputClassName}
                  value={pasteUrl}
                  onChange={(event) => setPasteUrl(event.target.value)}
                  placeholder="https://pokepast.es/..."
                  type="url"
                  required
                />
              </FieldLabel>
            ) : (
              <FieldLabel label="Team text" className="md:col-span-2">
                <textarea
                  className={`${inputClassName} min-h-44 resize-y py-2`}
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder="Miraidon @ Choice Specs..."
                  required
                />
              </FieldLabel>
            )}

            <div className="grid gap-3 md:col-span-2">
              {error ? <StatusMessage tone="error" icon={AlertCircle}>{error}</StatusMessage> : null}
              {status ? <StatusMessage tone="success" icon={CheckCircle2}>{status}</StatusMessage> : null}
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                type="submit"
                disabled={isImporting}
              >
                <Plus aria-hidden className="h-4 w-4" />
                {isImporting ? "Importing..." : "Add team"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading icon={UsersRound} title="Team library" />
          <div className="grid grid-cols-3 rounded-md bg-muted p-1">
            <ToggleButton compact active={activeList === "own"} onClick={() => setActiveList("own")}>My teams</ToggleButton>
            <ToggleButton compact active={activeList === "opponent"} onClick={() => setActiveList("opponent")}>Opponents</ToggleButton>
            <ToggleButton compact active={activeList === "popular"} onClick={() => setActiveList("popular")}>Popular teams</ToggleButton>
          </div>
        </div>

        {activeList === "popular" && popularLoadError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">{popularLoadError}</p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <FilterAutocomplete
            label="Name or source"
            value={searchText}
            onChange={setSearchText}
            placeholder="Regional, ladder, rain..."
            getSuggestions={activeList === "popular" ? undefined : (value) => getSourceSuggestions(library[activeList], value)}
            loadSuggestions={activeList === "popular" ? suggestPopularSources : undefined}
            complete={(_value, _caret, suggestion) => ({ value: suggestion, caret: suggestion.length })}
          />
          <div className="flex items-end gap-2">
            <FilterAutocomplete
              label="Included Pokemon"
              value={pokemonFilter}
              onChange={setPokemonFilter}
              placeholder="Pelipper, Archaludon"
              getSuggestions={activeList === "popular" ? undefined : (value, caret) => getPokemonSuggestions(library[activeList], value, caret)}
              loadSuggestions={activeList === "popular" ? suggestPopularPokemon : undefined}
              complete={(value, caret, suggestion) => completePokemonTerm(value, suggestion, caret)}
            />
              {hasFilters ? (
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary"
                  type="button"
                  onClick={() => { setSearchText(""); setPokemonFilter(""); }}
                  title="Clear filters"
                  aria-label="Clear filters"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr]">
          <div>
            <TeamSelector
              teams={visibleTeams}
              selectedTeamId={selectedTeam?.id ?? null}
              isLoading={activeList === "popular" ? isLoadingPopular && popularTeams.length === 0 : isLoadingTeams}
              hasFilters={hasFilters}
              isPopular={activeList === "popular"}
              onSelect={setSelectedTeamId}
            />
            {activeList === "popular" && popularHasMore ? (
              <button className="mt-3 h-10 w-full rounded-md border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-60" type="button" disabled={isLoadingPopular} onClick={() => void loadMorePopularTeams()}>
                {isLoadingPopular ? "Loading..." : "Load more"}
              </button>
            ) : null}
          </div>
          <TeamViewer
            team={selectedTeam}
            isDeleting={isDeleting}
            isPopular={activeList === "popular"}
            onEdit={activeList === "popular" && !canManagePopular ? undefined : openTeamEditor}
            onDelete={activeList === "popular" && !canManagePopular ? undefined : handleDeleteTeam}
          />
        </div>
      </section>

      <TeamEditorDialog
        open={isEditorOpen}
        initialTeam={editorTeam}
        sources={sources}
        defaultDestination={editorCollection}
        canManagePopular={canManagePopular}
        onOpenChange={setIsEditorOpen}
        onSave={handleEditorSave}
      />
    </div>
  );
}

const inputClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

function TeamSelector({ teams, selectedTeamId, isLoading, hasFilters, isPopular, onSelect }: {
  teams: SavedTeam[];
  selectedTeamId: string | null;
  isLoading: boolean;
  hasFilters: boolean;
  isPopular: boolean;
  onSelect: (id: string) => void;
}) {
  if (isLoading) return <p className="py-8 text-sm text-muted-foreground">Loading teams...</p>;
  if (teams.length === 0) {
    return <p className="rounded-md bg-muted px-4 py-8 text-center text-sm text-muted-foreground">{hasFilters ? "No teams match these filters." : isPopular ? "No popular teams yet." : "No saved teams yet."}</p>;
  }

  return (
    <div className="grid content-start gap-2" aria-label="Available teams">
      {teams.map((team) => (
        <button
          key={team.id}
          className={`rounded-md border p-3 text-left transition ${selectedTeamId === team.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-secondary/60"}`}
          type="button"
          onClick={() => onSelect(team.id)}
          aria-pressed={selectedTeamId === team.id}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{team.name}</p>
              <p className="truncate text-xs text-muted-foreground">{team.source}</p>
            </div>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold">{team.team.members.length}/6</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{team.team.members.map((member) => member.species).join(" · ")}</p>
        </button>
      ))}
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <div className="flex items-center gap-2"><Icon aria-hidden className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">{title}</h2></div>;
}

function FieldLabel({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`grid gap-2 text-sm font-medium ${className}`}>{label}{children}</label>;
}

function ToggleButton({ active, children, onClick, compact = false }: { active: boolean; children: ReactNode; onClick: () => void; compact?: boolean }) {
  return (
    <button className={`${compact ? "min-h-8 px-2 py-1 text-xs sm:px-3 sm:text-sm" : "min-h-10 px-2 py-1 text-xs sm:px-3 sm:text-sm"} rounded-md border font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary"}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function IconToggleButton({ active, children, icon: Icon, onClick }: { active: boolean; children: ReactNode; icon: LucideIcon; onClick: () => void }) {
  return (
    <button className={`flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground hover:bg-secondary"}`} type="button" onClick={onClick}>
      <Icon aria-hidden className="h-4 w-4" />{children}
    </button>
  );
}

function StatusMessage({ tone, icon: Icon, children }: { tone: "success" | "error"; icon: LucideIcon; children: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium ${tone === "success" ? "border-accent/40 bg-accent/10 text-accent" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span>
    </div>
  );
}
