import { html, HTMLTemplateResult, nothing, PropertyValues } from "lit";
import { Component } from "../../mixins";
import { ChromeAdvertisement, chromeAdvertisementEventName } from "../chromeHost/chromeHost";
import { state } from "lit/decorators.js";
import { AbstractComponent } from "../../abstractComponent";

export type ChromeTemplate = HTMLTemplateResult | typeof nothing;

export interface WithChromeProvider {
  chromeTop?(): ChromeTemplate;
  chromeBottom?(): ChromeTemplate;
  chromeLeft?(): ChromeTemplate;
  chromeRight?(): ChromeTemplate;
  chromeOverlay?(): ChromeTemplate;
}

export type ChromeProviderKey = keyof WithChromeProvider;

export const ChromeProvider = <T extends Component>(superClass: T) => {
  class ChromeProviderComponentClass extends superClass {
    @state()
    private chromeAdvertisement?: ChromeAdvertisement;

    private handleChromeAdvertisement(event: CustomEvent<ChromeAdvertisement>): void {
      this.chromeAdvertisement = event.detail;
      this.chromeAdvertisement?.connect(this as any);
    }

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
      this.addEventListener(chromeAdvertisementEventName, (event: any) => this.handleChromeAdvertisement(event));
    }

    public updated(change: PropertyValues<this>): void {
      super.updated(change);
    }

    public render() {
      // this.chromeAdvertisement?.requestUpdate();
      // return html`<slot @slotchange="${() => (this as any).handleSlotChange()}"></slot>`;
      return html`<slot></slot>`;
    }
  }

  return AbstractComponent(ChromeProviderComponentClass as Component);
};
