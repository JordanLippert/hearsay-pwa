import { test, expect } from "@playwright/test";

// Length of e2e/fixtures/adicionar-tres-macas.wav — keep this in sync with the
// fixture's actual duration (see fixtures/README.md for how to regenerate it).
const FIXTURE_DURATION_MS = 3_000;

test("recording the fixture audio resolves to a matched add_item command", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("/"); // demo app started separately, see README

  const button = page.getByRole("button", { name: /hold to talk/i });
  const box = await button.boundingBox();
  if (!box) throw new Error("VoiceButton not found on page");

  // Real pointer down/up via CDP (not dispatchEvent) so the browser's native
  // hit-testing, focus, and :active state fire the same way a real user gesture would.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(FIXTURE_DURATION_MS);
  await page.mouse.up();

  await expect(page.getByTestId("voice-result")).toHaveText(/add_item/, { timeout: 30_000 });
});
