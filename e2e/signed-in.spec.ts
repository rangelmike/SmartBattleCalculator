import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const pelipper = `Pelipper @ Sitrus Berry
Ability: Drizzle
Level: 50
EVs: 32 HP / 5 SpA
Modest Nature
- Hurricane
- Weather Ball
- Tailwind
- Wide Guard`;
const archaludon = `Archaludon @ Leftovers
Ability: Stamina
Level: 50
EVs: 32 HP / 29 SpD
Modest Nature
- Electro Shot
- Dragon Pulse
- Flash Cannon
- Protect`;

test("saves, reloads, edits, calculates and deletes against real local Supabase", async ({
  page
}) => {
  test.setTimeout(90_000);
  const url = process.env.SBC_TEST_SUPABASE_URL;
  const anon = process.env.SBC_TEST_SUPABASE_ANON_KEY;
  const service = process.env.SBC_TEST_SUPABASE_SERVICE_KEY;
  if (url !== "http://127.0.0.1:55421" || !anon || !service) {
    throw new Error("Run npm run verify:full; this test accepts only the disposable local API.");
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, service, options);
  const client = createClient(url, anon, options);
  const email = `browser-${randomUUID()}@verification.invalid`;
  const password = randomUUID();
  const { data: account, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (createError || !account.user) throw createError ?? new Error("No fixture user created.");
  try {
    // Password sessions are test fixtures only; actual Google OAuth has a separate external check.
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw error ?? new Error("No fixture session.");
    const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    await page.addInitScript(
      ({ key, session }) => {
        if (!sessionStorage.getItem("sbc.verification-bootstrap")) {
          localStorage.setItem(key, JSON.stringify(session));
          sessionStorage.setItem("sbc.verification-bootstrap", "done");
        }
      },
      { key, session: data.session }
    );
    await page.goto("/#profile");
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Team name", exact: true }).fill("Browser fixture");
    await page.getByRole("textbox", { name: "New source", exact: true }).fill("Verification");
    await page.getByRole("textbox", { name: "Team text", exact: true }).fill(pelipper);
    await page.getByRole("button", { name: "Add team", exact: true }).click();
    await expect(
      page.getByText("Team added to My teams and Opponent teams.", { exact: true })
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Browser fixture", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit team", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit team", exact: true });
    await editor.getByRole("textbox", { name: "Team name", exact: true }).fill("Browser edited");
    await editor.getByRole("button", { name: "Save team", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Browser edited", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Opponents", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Browser edited", exact: true })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Calculator", exact: true })
      .click();
    const panels = page.getByRole("navigation", { name: "Calculator panels" });
    // Desktop at >=1280 shows all panels; smaller desktop/mobile uses the existing carousel.
    if (await panels.isVisible())
      await panels.getByRole("button", { name: "My Team", exact: true }).click();
    const own = page.getByRole("region", { name: "My Team", exact: true });
    await own.getByRole("button", { name: "Select team", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Browser edited/ })
      .click();
    if (await panels.isVisible())
      await panels.getByRole("button", { name: "Field", exact: true }).click();
    const field = page.getByRole("region", { name: "Field", exact: true });
    await field.getByRole("textbox", { name: "Team text", exact: true }).fill(archaludon);
    await field.getByRole("button", { name: "Opponent", exact: true }).click();
    await expect(field.getByRole("status")).toHaveText("Team loaded into Opponent Team.");
    await field.getByRole("combobox", { name: "Weather", exact: true }).selectOption("Rain");
    const damage = page.getByRole("region", { name: "Damage calculations" });
    // Fixed golden range also covered by the focused damage test; verifies UI wiring.
    await expect(damage.getByText(/36–43 HP/)).toBeVisible();
    await expect(damage.getByLabel("Possible damage rolls").locator("span")).toHaveCount(16);
    await damage.getByRole("button", { name: "Raise My Team SpA stage", exact: true }).click();
    await expect(damage.getByLabel("My Team SpA stage near sprite", { exact: true })).toHaveValue(
      "1"
    );
    if (await panels.isVisible())
      await panels.getByRole("button", { name: "My Team", exact: true }).click();
    await own.getByRole("spinbutton", { name: "My Team current HP", exact: true }).fill("10");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Profile", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Calculator", exact: true })
      .click();
    await expect(damage.getByLabel("My Team SpA stage near sprite", { exact: true })).toHaveValue(
      "0"
    );
    await expect(
      own.getByRole("spinbutton", { name: "My Team current HP", exact: true })
    ).not.toHaveValue("10");
    if (await panels.isVisible())
      await panels.getByRole("button", { name: "Field", exact: true }).click();
    await field.getByRole("button", { name: "New battle", exact: true }).click();
    await expect(
      page.getByRole("list", { name: "My Team roster" }).getByRole("listitem")
    ).toHaveCount(1);
    await expect(
      page.getByRole("list", { name: "Opponent Team roster" }).getByRole("listitem")
    ).toHaveCount(0);
    await expect(field.getByRole("combobox", { name: "Weather", exact: true })).toHaveValue("");

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Delete team", exact: true }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Browser edited deleted.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("No saved teams yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browser edited", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Opponents", exact: true }).click();
    await expect(page.getByText("No saved teams yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browser edited", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  } finally {
    await client.auth.signOut();
    const { error } = await admin.auth.admin.deleteUser(account.user.id);
    expect(error, "Disposable user cleanup must succeed").toBeNull();
  }
});
