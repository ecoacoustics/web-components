import { defineConfig } from "@sand4rt/experimental-ct-web";

export default defineConfig({
  testDir: "src",
  // we start the vite server so that we can access the public/ directory
  // that contains audio files used in testing
  webServer: {
    command: "pnpm dlx vite --port 3000",
  },
});
