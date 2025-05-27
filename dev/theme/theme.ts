import theming from "../../src/helpers/themes/theming.css?inline";
import globalStyles from "../../src/helpers/themes/globalStyles.css?inline";
import { shoelaceTheming } from "../../src/helpers/themes/shoelaceTheme.ts";

export function appendStyles(content: string): void {
  const stylesheet = new CSSStyleSheet();
  stylesheet.replace(content);
  document.adoptedStyleSheets.push(stylesheet);
}

window.addEventListener("load", () => {
  appendStyles(theming);
  appendStyles(globalStyles);
  appendStyles(shoelaceTheming.cssText);
});
