import { CSSResultGroup, LitElement, unsafeCSS } from "lit";
import { ReactiveController } from "./reactiveController";
import theming from "../helpers/themes/theming.css?inline";

type ImplementsConstructor<T> = new (...args: any[]) => T;
type Component = ImplementsConstructor<LitElement>;

export const AbstractComponent = <T extends Component>(superClass: T) => {
  class AbstractComponentClass extends superClass {
    public constructor(...args: any[]) {
      super(args);
    }

    protected static finalizeStyles(styles: CSSResultGroup) {
      const themingStyles = unsafeCSS(theming);
      let newStyles: CSSResultGroup = [themingStyles];

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
        newStyles = [themingStyles, ...styles];
      } else if (styles !== undefined) {
        newStyles = [themingStyles, styles];
      }

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(newStyles);
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
