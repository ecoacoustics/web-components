import { CSSResultGroup, CSSResultOrNative, html, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { Component } from "../../mixins";
import { ChromeProviderKey, ChromeTemplate, WithChromeProvider } from "../chromeProvider/chromeProvider";
import { UnitConverter } from "../../../models/unitConverters";
import { AbstractComponent } from "../../abstractComponent";
import { map } from "lit/directives/map.js";
import { state } from "lit/decorators.js";
import chromeHostStyles from "./style.css?inline";
import { guard } from "lit/directives/guard.js";

export interface ChromeAdvertisement {
  unitConverter: UnitConverter;
  connect(provider: WithChromeProvider): void;
  disconnect(provider: WithChromeProvider): void;
  requestUpdate(): void;
}

export interface ChromeHostSurface {
  surface(): TemplateResult;
}

export const chromeAdvertisementEventName = "oe-chrome-advertisement";

export const ChromeHost = <T extends Component>(superClass: T) => {
  class ChromeHostComponentClass extends superClass {
    protected static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
      const chromeHostCss = unsafeCSS(chromeHostStyles);
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
    private providers = new Set<WithChromeProvider>();

    private unitConverter!: UnitConverter;
    private updateSurface = false;

    public firstUpdated(change: PropertyValues<this>): void {
      console.debug("update");
      super.firstUpdated(change);

      const chromeAdvertisement = {
        unitConverter: this.getUnitConverter(),
        connect: (provider: WithChromeProvider) => this.connect(provider),
        disconnect: (provider: WithChromeProvider) => this.disconnect(provider),
        requestUpdate: () => this.requestUpdate(),
      } satisfies ChromeAdvertisement;

      setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent<ChromeAdvertisement>(chromeAdvertisementEventName, {
            detail: chromeAdvertisement,
            bubbles: true,
          }),
        );
      }, 100);
    }

    private connect(provider: WithChromeProvider): void {
      this.providers.add(provider);
      this.requestUpdate();
    }

    private disconnect(provider: WithChromeProvider): void {
      this.providers.add(provider);
    }

    private getUnitConverter(): UnitConverter {
      return this.unitConverter;
    }

    private providerTemplate(key: ChromeProviderKey): ChromeTemplate {
      return html`${map(this.providers, (provider) => {
        if (typeof provider[key] === "function") {
          return provider[key]();
        }

        return nothing;
      })}`;
    }

    public render() {
      const componentTemplate = (this as any).surface();

      return html`
        <div id="chrome-wrapper">
          <div class="chrome chrome-top">${this.providerTemplate("chromeTop")}</div>
          <div class="chrome chrome-bottom">${this.providerTemplate("chromeBottom")}</div>
          <div class="chrome chrome-left">${this.providerTemplate("chromeLeft")}</div>
          <div class="chrome chrome-right">${this.providerTemplate("chromeRight")}</div>

          <div class="surface">
            <div class="chrome chrome-overlay">${this.providerTemplate("chromeOverlay")}</div>
            ${guard(this.updateSurface, () => componentTemplate)}
          </div>
        </div>
      `;
    }
  }

  return AbstractComponent(ChromeHostComponentClass as Component);
};
