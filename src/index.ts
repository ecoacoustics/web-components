// we import the polyfills first so that they are available when the components
// are imported
import "./polyfills/polyfills";

// oe web components barrel file
export * from "./components/verification-grid/verification-grid";
export * from "./components/media-controls/media-controls";
export * from "./components/spectrogram/spectrogram";
export * from "./components/indicator/indicator";
export * from "./components/axes/axes";

export * from "./components/subject-tag/subject-tag";
export * from "./components/data-source/data-source";
export * from "./components/task-meter/task-meter";

export * from "./components/decision/classification/classification";
export * from "./components/decision/verification/verification";
export * from "./components/decision/tag-prompt/tag-prompt";
export * from "./components/decision/skip/skip";

export * from "./components/info-card/info-card";

export * from "./components/annotate/annotate";
export * from "./components/annotation/annotation";
export * from "./components/tag/tag";

// You shouldn't need to use any of these components directly. But they are
// exported so that the internal components are defined whenever the barrel file
// is imported.
export * from "./components/logger/logger";
export * from "./components/typeahead/typeahead";
export * from "./components/bootstrap-modal/bootstrap-modal";
export * from "./components/decision/decision";
export * from "./components/verification-grid-settings/verification-grid-settings";
export * from "./components/progress-bar/progress-bar";
export * from "./components/verification-grid-tile/verification-grid-tile";

export * from "./helpers/constants/contextTokens";
export * from "./models/decisions/decisionNotRequired";
