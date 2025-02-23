// we import the polyfills first so that they are available when the components
// are imported
import "./polyfills/polyfills";
import { registerBundledIcons } from "./services/shoelaceLoader";
registerBundledIcons();

// oe web components barrel file
export * from "./components/media-controls/media-controls";
export * from "./components/spectrogram/spectrogram";
export * from "./components/indicator/indicator";
export * from "./components/logger/logger";
export * from "./components/axes/axes";
export * from "./components/verification-grid/verification-grid";
export * from "./components/verification-grid-tile/verification-grid-tile";
export * from "./components/info-card/info-card";
export * from "./components/data-source/data-source";
export * from "./components/bootstrap-modal/bootstrap-modal";
export * from "./components/decision/decision";
export * from "./components/decision/classification/classification";
export * from "./components/decision/verification/verification";
export * from "./components/verification-grid-settings/verification-grid-settings";
export * from "./components/progress-bar/progress-bar";
export * from "./components/annotate/annotate";
export * from "./components/annotation/annotation";
export * from "./components/tag/tag";

export * from "./helpers/constants/contextTokens";

// TODO: cherry pick shoelace components
// see: https://github.com/ecoacoustics/web-components/issues/83
// import "@shoelace-style/shoelace/dist/components/menu/menu.js";
// import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
// import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace";
