import { adoptStyles, html, PropertyValues, unsafeCSS } from "lit";
import { Component } from "../../../helpers/types/mixins";
import { ChromeAdvertisement, chromeAdvertisementEventName } from "../chromeHost/chromeHost";
import { state } from "lit/decorators.js";
import { AbstractComponent } from "../../abstractComponent";
import { ChromeTemplate } from "../types";
import providerStyles from "./style.css?inline";

// We export an interface for the ChromeProvider because the ChromeProvider
// class is dynamically created by the ChromeProvider mixin, meaning that
// TypeScript cannot pull out the ChromeProvider class from the mixin
// and use it as a type.
//
// To get around this, we export a polymorphic interface that narrows the
// typing of the ChromeProvider to methods that are exposed to the ChromeHost.
export interface IChromeProvider {
  chromeTop?(): ChromeTemplate;
  chromeBottom?(): ChromeTemplate;
  chromeLeft?(): ChromeTemplate;
  chromeRight?(): ChromeTemplate;
  chromeOverlay?(): ChromeTemplate;
  chromeRendered?(): void;
}

export const ChromeProvider = <T extends Component>(superClass: T) => {
  abstract class ChromeProviderComponentClass extends superClass implements IChromeProvider {
    public constructor(...args: any[]) {
      super(...args);

      this.attachAdvertisementListeners();
    }

    @state()
    private chromeAdvertisement?: ChromeAdvertisement;

    public abstract chromeTop?(): ChromeTemplate;
    public abstract chromeBottom?(): ChromeTemplate;
    public abstract chromeLeft?(): ChromeTemplate;
    public abstract chromeRight?(): ChromeTemplate;
    public abstract chromeOverlay?(): ChromeTemplate;
    public abstract chromeRendered?(): void;

    public connectedCallback(): void {
      super.connectedCallback();
      adoptStyles(this.shadowRoot as ShadowRoot, [
        unsafeCSS(providerStyles),
        ...(this.shadowRoot?.adoptedStyleSheets ?? []),
      ]);
    }

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
    }

    public updated(change: PropertyValues<this>): void {
      super.updated(change);
    }

    /**
     * A lifecycle method that is run when new elements are slotted in to the
     * providers default slot.
     *
     * This can be useful for attaching subscribers to nested components.
     * e.g. Subscribing to the spectrogram components unitConverter property
     * when the spectrogram is slotted into the provider.
     */
    protected handleSlotChange(): void {}

    private attachAdvertisementListeners(): void {
      this.addEventListener(chromeAdvertisementEventName, (event: Event) =>
        // TODO: remove this type cast. We might need a type guard
        this.handleChromeAdvertisement(event as CustomEvent<ChromeAdvertisement>),
      );
    }

    private handleChromeAdvertisement(event: CustomEvent<ChromeAdvertisement>): void {
      this.chromeAdvertisement = event.detail;
      this.chromeAdvertisement.connect(this);
    }

    public render() {
      this.chromeAdvertisement?.requestUpdate();
      return html`<slot @slotchange="${() => this.handleSlotChange()}"></slot>`;
    }
  }

  return AbstractComponent(ChromeProviderComponentClass);
};
