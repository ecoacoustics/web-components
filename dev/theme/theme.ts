import theming from "../..src/helpers/themes/theming.css?inline";
import globalStyles from "../../src/helpers/themes/globalStyles.css?inline";

export function appendStyles(content: string): void {
  const style = document.createElement("style");
  style.innerHTML = content;
  document.body.appendChild(style);
}

window.addEventListener("load", () => {
  appendStyles(theming);
  appendStyles(globalStyles);
});
