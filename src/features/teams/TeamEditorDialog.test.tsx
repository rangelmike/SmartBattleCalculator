import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { TeamEditorDialog, type TeamEditorSubmission } from "@/features/teams/TeamEditorDialog";
import type { SavedTeam } from "@/lib/pokemon/team-import";

const team: SavedTeam = {
  id: "popular-1", ownerId: "admin", name: "Rain", source: "Regional",
  pasteText: "", teamHash: "hash", createdAt: "", updatedAt: "",
  team: { format: "champions", members: [
    { name: "Pelipper", species: "Pelipper", level: 50, item: "Sitrus Berry", ability: "Drizzle", nature: "Modest", evs: { hp: 32, spa: 32, spe: 2 }, ivs: {}, moves: ["Hurricane"] },
    { name: "Archaludon", species: "Archaludon", level: 50, item: "Leftovers", ability: "Stamina", nature: "Modest", evs: { hp: 32, spa: 32, spe: 2 }, ivs: {}, moves: ["Electro Shot"] }
  ] }
};

describe("team editor ordering", () => {
  it("saves dragged members in the new order for a popular team", async () => {
    const onSave = vi.fn<(submission: TeamEditorSubmission) => Promise<void>>().mockResolvedValue(undefined);
    render(<TeamEditorDialog open initialTeam={team} sources={["Regional"]} defaultDestination="popular" canManagePopular onOpenChange={vi.fn()} onSave={onSave} />);
    const dataTransfer = {
      value: "", effectAllowed: "move", dropEffect: "move",
      setData(_type: string, value: string) { this.value = value; },
      getData() { return this.value; }
    };
    const pelipper = screen.getByRole("tab", { name: "Pelipper" });
    const archaludon = screen.getByRole("tab", { name: "Archaludon" });
    fireEvent.dragStart(pelipper, { dataTransfer });
    fireEvent.dragOver(archaludon, { dataTransfer });
    fireEvent.drop(archaludon, { dataTransfer });
    await waitFor(() => expect(screen.getAllByRole("tab").map((tab) => tab.textContent?.trim())).toEqual(["Archaludon", "Pelipper"]));
    fireEvent.click(await screen.findByRole("button", { name: "Save team" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].destination).toBe("popular");
    expect(onSave.mock.calls[0][0].team.members.map((member) => member.species)).toEqual(["Archaludon", "Pelipper"]);
  });

  it("changes nature from the stat controls without offering HP or an incomplete nature", async () => {
    await act(async () => {
      render(<TeamEditorDialog open initialTeam={team} sources={["Regional"]} defaultDestination="own" canManagePopular={false} onOpenChange={vi.fn()} onSave={vi.fn()} />);
      await Promise.resolve();
    });
    const raised = screen.getByLabelText("Nature raises");
    const lowered = screen.getByLabelText("Nature lowers");
    const nature = screen.getByLabelText("Nature");
    expect(nature).toHaveValue("Modest");
    expect(nature.querySelector('option[value="Modest"]')).toHaveTextContent("Modest (+SpA / -Atk)");
    expect(raised.querySelector('option[value="hp"]')).toBeNull();
    expect(lowered.querySelector('option[value="hp"]')).toBeNull();
    fireEvent.change(raised, { target: { value: "spe" } });
    expect(nature).toHaveValue("Timid");
    fireEvent.change(lowered, { target: { value: "spe" } });
    expect(nature).toHaveValue("Serious");
    expect(raised).toHaveValue("spe");
    expect(lowered).toHaveValue("spe");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save team" })).toBeEnabled());
  }, 10000);
});
