import { consume } from "@lit/context";
import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { IRootContext, rootContext } from "../../helpers/constants/contextTokens";

export class LoggerImplementation extends LitElement {
  @consume({ context: rootContext, subscribe: true })
  @property({ attribute: false })
  public logger?: IRootContext;

  protected doThing(): void {
    this.logger?.log("Hello, world!");
  }
}
