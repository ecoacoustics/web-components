import globalStyles from "../../src/helpers/themes/globalStyles.css?inline";
import { shoelaceTheming } from "../../src/helpers/themes/shoelace/shoelaceTheme.ts";

export function appendStyles(content: string): void {
  const stylesheet = new CSSStyleSheet();
  stylesheet.replace(content);
  document.adoptedStyleSheets.push(stylesheet);
}

window.addEventListener("load", () => {
  appendStyles(globalStyles);
  appendStyles(shoelaceTheming.cssText);
});
