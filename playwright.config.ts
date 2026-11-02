import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:6091",
    channel: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 6091",
    url: "http://127.0.0.1:6091",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      STUDIO_DATA_DIR: "projects/.e2e-v1",
      STUDIO_BUILD_DIR: "work/next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
