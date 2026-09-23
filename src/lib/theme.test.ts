import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, readTheme, saveTheme } from "@/lib/theme";

afterEach(() => {
  localStorage.removeItem("sbc.theme");
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.style.colorScheme = "";
});

describe("app theme", () => {
  it("defaults to dark and persists an explicit light choice", () => {
    localStorage.removeItem("sbc.theme");
    expect(readTheme()).toBe("dark");
    applyTheme(readTheme());
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");

    saveTheme("light");
    expect(readTheme()).toBe("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");

    saveTheme("dark");
    expect(readTheme()).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
