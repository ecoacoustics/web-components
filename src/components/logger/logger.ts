import { consume, createContext } from "@lit/context";
import { LitElement } from "lit";
import { property } from "lit/decorators.js";

export interface ILogger {
  log: (message: string) => void;
}

export const rootContext = createContext<ILogger>(Symbol("rootContext"));

export class LoggerImplementation extends LitElement {
  @consume({ context: rootContext, subscribe: true })
  @property({ attribute: false })
  public logger?: ILogger;

  protected doThing(): void {
    this.logger?.log("Hello, world!");
  }
}
