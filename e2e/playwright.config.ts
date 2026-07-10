import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  use: {
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${path.join(__dirname, "fixtures/adicionar-tres-macas.wav")}`,
      ],
    },
  },
});
