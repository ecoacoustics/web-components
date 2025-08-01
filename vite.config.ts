import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import VitePluginCustomElementsManifest from "vite-plugin-cem";
import svgLoader from "vite-svg-loader";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
// import mkcert from "vite-plugin-mkcert";

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
    outDir: "./dist",
    copyPublicDir: false,
    lib: {
      // we exclude the entry object from formatting so that we can inline all
      // of the entry point components onto their own lines
      // if we instead allowed prettier to format the entry object, it would
      // split some of the key/value pairs onto multiple lines
      // prettier-ignore
      entry: {
        // the components.js entry imports all components, helpers, and services
        // in a single barrel file. This is typically the entrypoint for CDN's
        components: "./src/index.ts",

        // each entry point represents a component, helper, or service that can
        // be imported individually without importing all components
        "components/media-controls": "./src/components/media-controls/media-controls.ts",
        "components/spectrogram": "./src/components/spectrogram/spectrogram.ts",
        "components/indicator": "./src/components/indicator/indicator.ts",
        "components/logger": "./src/components/logger/logger.ts",
        "components/axes": "./src/components/axes/axes.ts",
        "components/verification-grid": "./src/components/verification-grid/verification-grid.ts",
        "components/verification-grid-tile": "./src/components/verification-grid-tile/verification-grid-tile.ts",
        "components/typeahead": "./src/components/typeahead/typeahead.ts",
        "components/info-card": "./src/components/info-card/info-card.ts",
        "components/data-source": "./src/components/data-source/data-source.ts",
        "components/bootstrap-modal": "./src/components/bootstrap-modal/bootstrap-modal.ts",
        "components/decision": "./src/components/decision/decision.ts",
        "components/classification": "./src/components/decision/classification/classification.ts",
        "components/verification": "./src/components/decision/verification/verification.ts",
        "components/tag-prompt": "./src/components/decision/tag-prompt/tag-prompt.ts",
        "components/verification-grid-settings": "./src/components/verification-grid-settings/verification-grid-settings.ts",
        "components/progress-bar": "./src/components/progress-bar/progress-bar.ts",
        "components/annotate": "./src/components/annotate/annotate.ts",
        "components/annotation": "./src/components/annotation/annotation.ts",
        "components/tag": "./src/components/tag/tag.ts",

        "components/helpers/constants/contextTokens": "./src/helpers/constants/contextTokens.ts",
      },
      formats: ["es"],
    },
  },
});
