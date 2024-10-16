import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import VitePluginCustomElementsManifest from "vite-plugin-cem";
import svgLoader from "vite-svg-loader";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
// import mkcert from "vite-plugin-mkcert";

// vite config for the dev server and documentation
export default defineConfig({
  // if we use the default "spa" app type, if a page is not found, the server
  // will return the index.html file. This is annoying for tests and dev
  // environments that would expect a 404 response if a resource is not found
  appType: "mpa",
  plugins: [
    VitePluginCustomElementsManifest({
      files: ["./src/components/**/*.ts"],
      lit: true,
    }),
    nodePolyfills(),
    svgLoader(),
    // mkcert(),
  ],
  css: {
    postcss: {
      plugins: [postcssNested, autoprefixer],
    },
  },
  // we set the base to an empty string because Vite's default base is "/" which converts all module imports into
  // absolute paths. This works for a Vite server, but will fail when the components.js (the root file) is not at the
  // top level path (when it is in a sub-directory of the project).
  // this is not a problem during development, but is a problem when deploying to a CDN since the path that we want
  // imports to be relative to is not the root path
  // e.g. if the cdn path jsdelivr.com/npm/@ecoacoustics/components@1.0.0/components.js requests assets/processor.js
  //      we want the import to be prepended with /npm/@ecoacoustics/components@1.0.0/ instead of /
  // by setting the base to an empty string, all imports will be relative to the current path (in a vite dev server this
  // is confusingly not the path of the file importing the module, but a relative path to this vite.config.js file)
  // but when built using a library build, imports will be relative to the path of the js file importing them
  base: "",
  // we have to enable a secure context and set the Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy
  // headers to use the SharedArrayBuffer
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Access-Control-Allow-Origin": "*",
    },
    host: "development.ecosounds.org",
    // https: true,
  },
  build: {
    // TODO: this should not be the root directory
    outDir: ".",
    copyPublicDir: false,
    lib: {
      name: "components",
      fileName: "components",
      entry: "src/components/index.ts",
      formats: ["es"],
    },
  },
});
