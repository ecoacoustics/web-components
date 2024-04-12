import { defineConfig } from "vite";
import VitePluginCustomElementsManifest from "vite-plugin-cem";
import svgLoader from "vite-svg-loader";
import mkcert from 'vite-plugin-mkcert'

// vite config for the dev server and documentation
export default defineConfig({
  plugins: [
    VitePluginCustomElementsManifest({
      files: ["./src/components/**/*.ts"],
      lit: true,
    }) as any,
    svgLoader(),
    mkcert(),
  ],
  // we have to enable a secure context and set the Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy
  // headers to use the SharedArrayBuffer
  server: {
    https: true,
    origin: "*",
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
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
