import { html, PropertyValues } from "lit";
import { Component } from "../../mixins";
import { ChromeAdvertisement, chromeAdvertisementEventName } from "../chromeHost/chromeHost";
import { state } from "lit/decorators.js";
import { AbstractComponent } from "../../abstractComponent";
import { ChromeTemplate } from "../types";

export const ChromeProvider = <T extends Component>(superClass: T) => {
  abstract class ChromeProviderComponentClass extends superClass {
    @state()
    private chromeAdvertisement?: ChromeAdvertisement;

    public abstract chromeTop?(): ChromeTemplate;
    public abstract chromeBottom?(): ChromeTemplate;
    public abstract chromeLeft?(): ChromeTemplate;
    public abstract chromeRight?(): ChromeTemplate;
    public abstract chromeOverlay?(): ChromeTemplate;

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
      this.addEventListener(chromeAdvertisementEventName, (event: any) => this.handleChromeAdvertisement(event));
    }

    public updated(change: PropertyValues<this>): void {
      super.updated(change);
    }

    /** You might want to override this */
    protected handleSlotChange(): void {}

    private handleChromeAdvertisement(event: CustomEvent<ChromeAdvertisement>): void {
      this.chromeAdvertisement = event.detail;
      this.chromeAdvertisement?.connect(this as any);
    }

    public render() {
      this.chromeAdvertisement?.requestUpdate();
      return html`<slot @slotchange="${() => this.handleSlotChange()}"></slot>`;
    }
  }

  return AbstractComponent(ChromeProviderComponentClass);
};
