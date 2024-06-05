import { CSSResultGroup, LitElement } from "lit";
import { ReactiveController } from "./reactiveController";
import { theming } from "../helpers/themes/theming";

type ImplementsConstructor<T> = new (...args: any[]) => T;
type Component = ImplementsConstructor<LitElement>;

export const AbstractComponent = <T extends Component>(superClass: T) => {
  class AbstractComponentClass extends superClass {
    public constructor(...args: any[]) {
      super(args);
    }

    protected static finalizeStyles(styles: CSSResultGroup) {
      let newStyles = [theming] as any[];

      if (Array.isArray(styles)) {
        newStyles = [...styles, theming];
      } else if (styles !== undefined) {
        newStyles = [styles, theming];
      }

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(newStyles);
    }

    // protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
    //   const elementStyles = [getCompatibleStyle(theming)];
    //   if (Array.isArray(styles)) {
    //     // Dedupe the flattened array in reverse order to preserve the last items.
    //     // Casting to Array<unknown> works around TS error that
    //     // appears to come from trying to flatten a type CSSResultArray.
    //     const set = new Set((styles as Array<unknown>).flat(Infinity).reverse());
    //     // Then preserve original order by adding the set items in reverse order.
    //     for (const s of set) {
    //       elementStyles.unshift(getCompatibleStyle(s as CSSResultOrNative));
    //     }
    //   } else if (styles !== undefined) {
    //     elementStyles.push(getCompatibleStyle(styles));
    //   }

    //   return elementStyles;
    // }

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
