import { LitElement } from "lit";
import { ComponentModifier } from "./componentModifier";
import { shoelaceTheming } from "../../helpers/themes/shoelace/shoelaceTheme";
import { registerBundledIcons } from "../../services/shoelaceLoader";

// A local variable (not exported) to keep track of if Shoelace has been
// imported into the page
let doneRegister = false;

export function withShoelace(): ComponentModifier {
  return (component: LitElement) => {
    if (component.shadowRoot) {
      const themingStyles = new CSSStyleSheet();
      themingStyles.replace(shoelaceTheming.cssText);
      document.adoptedStyleSheets.push(themingStyles);

      if (!doneRegister && !customElements.get("sl-button")) {
        doneRegister = true;
        registerShoelace();
      }
    }
  };
}

// By dynamically registering shoelace depending on if it is used, we can
// reduce the cherry picked bundle size.
function registerShoelace(): void {
  // TODO: cherry pick shoelace components
  // see: https://github.com/ecoacoustics/web-components/issues/83
  import("@shoelace-style/shoelace");
  registerBundledIcons();
}
