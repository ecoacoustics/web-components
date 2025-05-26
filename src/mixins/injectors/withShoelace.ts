import { LitElement } from "lit";
import { Injector } from "./injector";
import { shoelaceTheming } from "../../helpers/themes/shoelaceTheme";
import { registerBundledIcons } from "../../services/shoelaceLoader";

let completedRegister = false;

export function withShoelace(): Injector {
  return (component: LitElement) => {
      if (component.shadowRoot) {
        const themingStyles = new CSSStyleSheet();
        themingStyles.replace(shoelaceTheming.cssText);
        document.adoptedStyleSheets.push(themingStyles);

        if (!completedRegister) {
          completedRegister = true;
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
