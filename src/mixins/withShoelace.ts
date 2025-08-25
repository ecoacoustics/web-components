import { CSSResultGroup } from "lit";
import { shoelaceTheming } from "../helpers/themes/shoelace/shoelaceTheme";
import { registerBundledIcons } from "../services/shoelaceLoader";
import { Component } from "../helpers/types/mixins";
import { mergeStyles } from "../helpers/styles/merge";

// A local variable (not exported) to keep track of if Shoelace has been
// imported into the page
let doneRegister = false;

/**
 * For every component, we redeclare our shoelace override variables at the
 * web component's shadow root.
 */
export const WithShoelace = <T extends Component>(superClass: T): Component => {
  return class ShoelaceClass extends superClass {
    public static finalizeStyles(styles?: CSSResultGroup) {
      if (!doneRegister) {
        registerShoelace();
      }

      const newStyles: CSSResultGroup = mergeStyles([shoelaceTheming.cssText], styles);

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(newStyles);
    }
  };
};

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
