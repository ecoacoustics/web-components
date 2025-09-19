import { consume } from "@lit/context";
import { LitElement } from "lit";
import { IRootContext, rootContext } from "../../helpers/constants/contextTokens";

export class LoggerImplementation extends LitElement {
  @consume({ context: rootContext, subscribe: true })
  private logger?: IRootContext;

  protected doThing(): void {
    this.logger?.log("Hello, world!");
  }
}
