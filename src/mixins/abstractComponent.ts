import { CSSResultGroup, CSSResultOrNative } from "lit";
import { ReactiveController } from "./reactiveController";
import { Component } from "../helpers/types/mixins";
import { mergeStyles } from "../helpers/styles/merge";
import globalStyles from "../helpers/themes/globalStyles.css?inline";
import defaultTheming from "../helpers/themes/theming.css?inline";

let themingInserted = false;

export const AbstractComponent = <T extends Component>(superClass: T): Component => {
  class AbstractComponentClass extends superClass {
    public static finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
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

      // By using "replace", the default theming will be injected in async
      // this means that applying the default stylesheet is a fire and forget
      // async operation.
      const themingStyles = new CSSStyleSheet();
      themingStyles.replace(defaultTheming);
      document.adoptedStyleSheets.push(themingStyles);
    }

    private reactiveController = new ReactiveController(this);

    // TODO: find out if we have to explicitly call hostConnected and
    // hostDisconnected
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
