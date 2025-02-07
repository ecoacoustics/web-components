import { CSSResultGroup, CSSResultOrNative, html, PropertyValues, unsafeCSS } from "lit";
import { Component } from "../../mixins";
import { ChromeAdvertisement, chromeAdvertisementEventName } from "../chromeHost/chromeHost";
import { state } from "lit/decorators.js";
import { AbstractComponent } from "../../abstractComponent";
import { ChromeTemplate } from "../types";
import chromeProviderStyles from "./style.css?inline";

export const ChromeProvider = <T extends Component>(superClass: T) => {
  abstract class ChromeProviderComponentClass extends superClass {
    public constructor(...args: any[]) {
      super(...args);

      this.attachAdvertisementListeners();
    }

    protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
      const chromeHostCss = unsafeCSS(chromeProviderStyles);
      let returnedStyles: CSSResultGroup = [chromeHostCss];

      if (Array.isArray(styles)) {
        returnedStyles = [chromeHostCss, ...styles];
      } else if (styles !== undefined) {
        returnedStyles = [chromeHostCss, styles];
      }

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(returnedStyles);
    }

    @state()
    private chromeAdvertisement?: ChromeAdvertisement;

    public abstract chromeTop?(): ChromeTemplate;
    public abstract chromeBottom?(): ChromeTemplate;
    public abstract chromeLeft?(): ChromeTemplate;
    public abstract chromeRight?(): ChromeTemplate;
    public abstract chromeOverlay?(): ChromeTemplate;
    public abstract chromeRendered?(): void;

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
    }

    public updated(change: PropertyValues<this>): void {
      super.updated(change);
    }

    /** You might want to override this */
    protected handleSlotChange(): void {}

    private attachAdvertisementListeners(): void {
      this.addEventListener(chromeAdvertisementEventName, (event: any) => this.handleChromeAdvertisement(event));
    }

    private handleChromeAdvertisement(event: CustomEvent<ChromeAdvertisement>): void {
      this.chromeAdvertisement = event.detail;
      this.chromeAdvertisement?.connect(this as any);
    }

    public render() {
      this.chromeAdvertisement?.requestUpdate();
      return html`
        <div
          style="
            display: flex;
            flex-direction: column;
            flex: 1 1 0;
          "
        >
          <slot @slotchange="${() => this.handleSlotChange()}"></slot>
        </div>
      `;
    }
  }

  return AbstractComponent(ChromeProviderComponentClass);
};
