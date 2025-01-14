// we import the polyfills first so that they are available when the components
// are imported
import "../polyfills/polyfills";
import { registerBundledIcons } from "../services/shoelaceLoader";
registerBundledIcons();

// oe web components barrel file
export * from "./media-controls/media-controls";
export * from "./spectrogram/spectrogram";
export * from "./indicator/indicator";
export * from "./logger/logger";
export * from "./axes/axes";
export * from "./verification-grid/verification-grid";
export * from "./verification-grid-tile/verification-grid-tile";
export * from "./info-card/info-card";
export * from "./data-source/data-source";
export * from "./bootstrap-modal/bootstrap-modal";
export * from "./decision/decision";
export * from "./decision/classification/classification";
export * from "./decision/verification/verification";
export * from "./verification-grid-settings/verification-grid-settings";
export * from "./progress-bar/progress-bar";

export * from "../helpers/constants/contextTokens";

// TODO: cherry pick shoelace components
// see: https://github.com/ecoacoustics/web-components/issues/83
// import "@shoelace-style/shoelace/dist/components/menu/menu.js";
// import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
// import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace";
