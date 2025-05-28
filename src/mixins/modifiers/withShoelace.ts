import { LitElement } from "lit";
import { ComponentModifier } from "./componentModifier";
import { shoelaceTheming } from "../../helpers/themes/shoelace/shoelaceTheme";
import { registerBundledIcons } from "../../services/shoelaceLoader";

// A local variable (not exported) to keep track of if Shoelace has been
// imported into the page
let doneRegister = false;

/**
  * For every component, we redeclare our shoelace override variables at the
  * web component's shadow root.
  */
export function withShoelace(): ComponentModifier {
  return (component: LitElement) => {
    if (component.shadowRoot) {
      const themingStyles = new CSSStyleSheet();
      themingStyles.replace(shoelaceTheming.cssText);
      component.shadowRoot.adoptedStyleSheets.push(themingStyles);

      if (!doneRegister && !customElements.get("sl-button")) {
        registerShoelace();
      }
    }
  };
}

/**
  * By dynamically registering shoelace depending on if it is used, we can
  * reduce the cherry picked bundle size.
  *
  * Because shoelace is registered at the document level, this should only
  * be performed once.
  */
function registerShoelace(): void {
  doneRegister = true;

  // TODO: cherry pick shoelace components
  // see: https://github.com/ecoacoustics/web-components/issues/83
  import("@shoelace-style/shoelace").then(() => {
    registerBundledIcons();
  });
}
