import { theming } from "../../src/helpers/themes/theming";

export function LitStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.innerHTML = theming.cssText;
  return style;
}

window.addEventListener("load", () => {
  document.body.appendChild(LitStyles());
});
