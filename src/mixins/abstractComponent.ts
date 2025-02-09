import { CSSResultGroup, CSSResultOrNative, unsafeCSS } from "lit";
import { ReactiveController } from "./reactiveController";
import { Component } from "./mixins";
import { mergeStyles } from "../helpers/styles";
import globalStyles from "../helpers/themes/globalStyles.css?inline";
import defaultTheming from "../helpers/themes/theming.css?inline";

let themingInserted = false;

export const AbstractComponent = <T extends Component>(superClass: T) => {
  class AbstractComponentClass extends superClass {
    public static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
      // we only want to apply the theming styles once to the documents root
      if (!themingInserted) {
        AbstractComponentClass.insertTheming();
      }

      const newStyles: CSSResultGroup = mergeStyles([globalStyles], styles);

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

  return AbstractComponentClass;
};
