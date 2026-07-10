import { test, expect } from "@playwright/test";

test("recording the fixture audio resolves to a matched add_item command", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("http://localhost:5173"); // demo app started separately, see README

  await page.getByRole("button", { name: /hold to talk/i }).dispatchEvent("pointerdown");
  await page.waitForTimeout(3000); // fixture clip length
  await page.getByRole("button", { name: /hold to talk/i }).dispatchEvent("pointerup");

  await expect(page.getByTestId("voice-result")).toHaveText(/add_item/, { timeout: 30_000 });
});
