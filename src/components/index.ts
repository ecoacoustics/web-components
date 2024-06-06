// we import the polyfills first so that they are available when the components
// are imported
import "../polyfills/polyfills";

// oe web components barrel file
export * from "./mediaControls/mediaControls";
export * from "./spectrogram/spectrogram";
export * from "./indicator/indicator";
export * from "./logger/logger";
export * from "./axes/axes";
export * from "./verification-grid/verification-grid";
export * from "./decision/decision";
export * from "./verification-grid-tile/verification-grid-tile";
export * from "./info-card/info-card";
export * from "./data-source/data-source";
export * from "./verification-grid/help-dialog";

// TODO: cherry pick shoelace components
// import "@shoelace-style/shoelace/dist/components/menu/menu.js";
// import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
// import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace";
import "@shoelace-style/shoelace/dist/themes/light.css";
