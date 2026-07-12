import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "bun run --cwd demo dev",
    cwd: __dirname,
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      // Fake-audio-capture flags below are Chromium-specific — kept off the
      // shared `use` block and scoped to this project so a future Firefox/WebKit
      // project doesn't silently inherit bogus CLI args.
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-audio-capture=${path.join(__dirname, "fixtures/adicionar-tres-macas.wav")}`,
          ],
        },
      },
    },
  ],
});
