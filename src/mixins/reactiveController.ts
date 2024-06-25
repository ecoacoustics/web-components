import { ReactiveControllerHost } from "lit";

type OeComponent = ReactiveControllerHost & Element;

export class ReactiveController implements ReactiveController {
  public constructor(host: OeComponent) {
    this.host = host;
    this.host.addController(this);
  }

  protected host: OeComponent;

  public hostConnected(): void {
    if (!this.host.shadowRoot) {
      throw new Error("Shadow root not found");
    }

    this.host.shadowRoot.addEventListener("slotchange", ($event) => this.handleSlotChange($event));
  }

  public hostDisconnected(): void {
    if (!this.host.shadowRoot) {
      throw new Error("Shadow root not found");
    }

    this.host.shadowRoot.removeEventListener("slotchange", ($event) => this.handleSlotChange($event));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleSlotChange(_: Event): void {
    this.host.requestUpdate();
  }
}
