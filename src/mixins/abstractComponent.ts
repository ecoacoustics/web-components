import { CSSResultGroup, CSSResultOrNative, unsafeCSS } from "lit";
import { ReactiveController } from "./reactiveController";
import { Component } from "./mixins";
import globalStyles from "../helpers/themes/globalStyles.css?inline";
import defaultTheming from "../helpers/themes/theming.css?inline";

let themingInserted = false;

export const AbstractComponent = <T extends Component>(superClass: T) => {
  class AbstractComponentClass extends superClass {
    protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
      // we only want to apply the theming styles once to the documents root
      if (!themingInserted) {
        AbstractComponentClass.insertTheming();
      }

      const globalCss = unsafeCSS(globalStyles);
      let newStyles: CSSResultGroup = [globalCss];

      // it is important that the theming is the first style
      // this is because all the styles in the styles array get combined into
      // one big computed.ts file, with the items at the start of the array
      // being at the top of the file
      // by putting the theming first, this means that the theme styles will be
      // first, and can be overridden by component styles which will be declared
      // later in the file
      // if the theming is not the first style, then the component styles will
      // be overridden by the theming styles
      if (Array.isArray(styles)) {
        newStyles = [globalCss, ...styles];
      } else if (styles !== undefined) {
        newStyles = [globalCss, styles];
      }

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(newStyles);
    }

    private static insertTheming(): void {
      themingInserted = true;

      const style = document.createElement("style");
      style.innerHTML = defaultTheming;
      document.head.appendChild(style);
    }

    private reactiveController = new ReactiveController(this);

    // TODO: find out if we have to explicitly call hostConnected and hostDisconnected
    public connectedCallback(): void {
      super.connectedCallback();
      this.reactiveController.hostConnected();
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();
      this.reactiveController.hostDisconnected();
    }
  }

  return AbstractComponentClass as Component;
};
