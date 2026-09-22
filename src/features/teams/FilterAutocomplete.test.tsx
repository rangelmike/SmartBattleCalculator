import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterAutocomplete } from "@/features/teams/FilterAutocomplete";
import { completePokemonTerm, getPokemonSuggestions, getSourceSuggestions } from "@/lib/pokemon/team-search";
import type { SavedTeam } from "@/lib/pokemon/team-import";

const teams = [
  { source: "Regional", team: { members: [{ species: "Pelipper" }, { species: "Archaludon" }] } },
  { source: "Regional", team: { members: [{ species: "Pelipper" }, { species: "Archaludon" }] } },
  { source: "Ladder", team: { members: [{ species: "Torkoal" }] } }
] as SavedTeam[];

function PokemonFilter() {
  const [value, setValue] = useState("");
  return (
    <FilterAutocomplete
      label="Included Pokemon"
      value={value}
      onChange={setValue}
      placeholder="Pokemon"
      getSuggestions={(query, caret) => getPokemonSuggestions(teams, query, caret)}
      complete={(query, caret, name) => completePokemonTerm(query, name, caret)}
    />
  );
}

function SourceFilter() {
  const [value, setValue] = useState("");
  return (
    <FilterAutocomplete
      label="Name or source"
      value={value}
      onChange={setValue}
      placeholder="Source"
      getSuggestions={(query) => getSourceSuggestions(teams, query)}
      complete={(_query, _caret, name) => ({ value: name, caret: name.length })}
    />
  );
}

function RemoteSourceFilter() {
  const [value, setValue] = useState("");
  return (
    <FilterAutocomplete
      label="Popular source"
      value={value}
      onChange={setValue}
      placeholder="Source"
      loadSuggestions={(query) => Promise.resolve(query.startsWith("Reg") ? [{ name: "Regional", teamCount: 100 }] : [])}
      complete={(_query, _caret, name) => ({ value: name, caret: name.length })}
    />
  );
}

describe("filter autocomplete", () => {
  it("completes each Pokemon in a multi-Pokemon query with Enter", () => {
    render(<PokemonFilter />);
    const input = screen.getByRole<HTMLInputElement>("combobox", { name: "Included Pokemon" });
    fireEvent.change(input, { target: { value: "Peli" } });
    expect(screen.getByRole("option", { name: /Pelipper.*2 teams/ })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Pelipper");

    fireEvent.change(input, { target: { value: "Pelipper, Arch" } });
    expect(screen.getByRole("option", { name: /Archaludon.*2 teams/ })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Pelipper, Archaludon");
  });

  it("completes a source with Enter", () => {
    render(<SourceFilter />);
    const input = screen.getByRole<HTMLInputElement>("combobox", { name: "Name or source" });
    fireEvent.change(input, { target: { value: "Reg" } });
    expect(screen.getByRole("option", { name: /Regional.*2 teams/ })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Regional");
  });

  it("completes an asynchronously loaded popular source", async () => {
    render(<RemoteSourceFilter />);
    const input = screen.getByRole<HTMLInputElement>("combobox", { name: "Popular source" });
    fireEvent.change(input, { target: { value: "Reg" } });
    expect(await screen.findByRole("option", { name: /Regional.*100 teams/ })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Regional");
  });
});
