const hasAnchorPositioning = "anchorName" in document.documentElement.style;

// We dynamically import the anchor positioning polyfill from a cdn so that if
// the polyfill is not needed by the browser, it doesn't get added to the bundle
// size
//
// We use the css-anchor-position polyfill from
// https://github.com/oddbird/css-anchor-positioning
// BSD-3-Clause license
if (!hasAnchorPositioning) {
  // we use vite-ignore here so that the dynamic import is explicitly not added
  // to the bundle
  // prettier-ignore
  import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@oddbird/css-anchor-positioning@0.4.0/dist/css-anchor-positioning.js" as any);
}
