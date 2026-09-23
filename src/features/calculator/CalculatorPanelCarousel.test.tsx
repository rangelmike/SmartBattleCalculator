import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalculatorPanelCarousel } from "@/features/calculator/CalculatorPanelCarousel";

describe("calculator lower panel navigation", () => {
  it("moves between all three panels and preserves their form state", () => {
    render(<CalculatorPanelCarousel>
      <section><input aria-label="My Team name" /></section>
      <section><input aria-label="Weather" /></section>
      <section><input aria-label="Opponent name" /></section>
    </CalculatorPanelCarousel>);

    const track = screen.getByRole("region", { name: "Calculator lower panels" });
    Object.defineProperty(track, "clientWidth", { value: 320 });
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo;
    fireEvent.change(screen.getByRole("textbox", { name: "My Team name" }), { target: { value: "Rain" } });

    fireEvent.click(screen.getByRole("button", { name: "Field" }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 320, behavior: "smooth" });
    expect(screen.getByRole("button", { name: "Field" })).toHaveAttribute("aria-current", "page");
    fireEvent.change(screen.getByRole("textbox", { name: "Weather" }), { target: { value: "Rain" } });

    track.scrollLeft = 640;
    fireEvent.scroll(track);
    expect(screen.getByRole("button", { name: "Opponent Team" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("textbox", { name: "My Team name" })).toHaveValue("Rain");
    expect(screen.getByRole("textbox", { name: "Weather" })).toHaveValue("Rain");
  });
});
