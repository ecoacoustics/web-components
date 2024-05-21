import { LitElement } from "lit";
import { ReactiveController } from "./reactiveController";
import { theming } from "../helpers/themes/theming";

type ImplementsConstructor<T> = new (...args: any[]) => T;
type Component = ImplementsConstructor<LitElement>;

export const AbstractComponent = <T extends Component>(superClass: T) => {
  class AbstractComponentClass extends superClass {
    public constructor(...args: any[]) {
      super(args);
    }

    private reactiveController = new ReactiveController(this);

    //? We might not have to explicitly call hostConnected and hostDisconnected
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
