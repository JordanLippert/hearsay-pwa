import { test, expect } from "@playwright/test";

// Length of e2e/fixtures/adicionar-tres-macas.wav — keep this in sync with the
// fixture's actual duration (see fixtures/README.md for how to regenerate it).
const FIXTURE_DURATION_MS = 13_500;

test("recording the fixture audio resolves to a matched add_item command", async ({ page, context }) => {
  test.setTimeout(200_000);

  // TEMP diagnostics for a CI-only failure investigation (load-status never
  // reaches "ready" in GitHub Actions, though it does locally) — remove once
  // root-caused.
  page.on("console", (msg) => console.log(`[browser console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[browser pageerror] ${err.message}`));
  page.on("response", (res) => {
    if (!res.ok()) console.log(`[response] ${res.status()} ${res.url()}`);
  });
  const seenStatuses = new Set<string>();
  const poll = setInterval(async () => {
    try {
      const status = await page.getByTestId("load-status").textContent();
      const alertText = await page.getByRole("alert").textContent().catch(() => null);
      const key = `${status}|${alertText}`;
      if (!seenStatuses.has(key)) {
        seenStatuses.add(key);
        console.log(`[diagnostic] t=${Date.now()} load-status="${status}" alert=${JSON.stringify(alertText)}`);
      }
    } catch {
      // page not ready yet
    }
  }, 500);

  try {
    await context.grantPermissions(["microphone"]);
    await page.goto("/"); // demo app started separately, see README

    const button = page.getByRole("button", { name: /hold to talk/i });
    const box = await button.boundingBox();
    if (!box) throw new Error("VoiceButton not found on page");

    // Real pointer down/up via CDP (not dispatchEvent) so the browser's native
    // hit-testing, focus, and :active state fire the same way a real user gesture would.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // The first call to useVoiceCommand's start() triggers a cold Whisper model
    // load (network download + webgpu/wasm session compile), which can take far
    // longer than the fixture's audio. useVoiceCommand.status flips to
    // "recording" the instant start() is called, well before the model is
    // actually ready and the recorder has actually started, so we time the hold
    // off the demo's exposed loadProgress "ready" signal instead of a fixed
    // guess. We deliberately do this as a single continuous hold (not a
    // discardable warm-up press followed by a second one): Chromium's
    // --use-file-for-fake-audio-capture streams the fixture file once and does
    // not restart it for a second getUserMedia() call, so a two-press approach
    // would starve the real press of audio.
    await expect(page.getByTestId("load-status")).toHaveText("ready", { timeout: 120_000 });
    await page.waitForTimeout(FIXTURE_DURATION_MS);
    await page.mouse.up();

    await expect(page.getByTestId("voice-result")).toHaveText(/add_item/, { timeout: 30_000 });
  } finally {
    clearInterval(poll);
  }
});
