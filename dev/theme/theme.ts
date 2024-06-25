import theming from "../../src/helpers/themes/theming.css?inline";

export function LitStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.innerHTML = theming;
  return style;
}

window.addEventListener("load", () => {
  document.body.appendChild(LitStyles());
});
