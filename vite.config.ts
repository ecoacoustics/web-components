import { defineConfig } from "vite";
import VitePluginCustomElementsManifest from "vite-plugin-cem";
import svgLoader from "vite-svg-loader";

// vite config for the dev server and documentation
export default defineConfig({
  plugins: [
    VitePluginCustomElementsManifest({
      files: ["./src/components/**/*.ts"],
      lit: true,
    }) as any,
    svgLoader(),
  ],
  server: {},
  build: {
    outDir: "js/",
    copyPublicDir: false,
    lib: {
      name: "components",
      fileName: "components",
      entry: "src/components/index.ts",
      formats: ["es"],
    },
  },
});
