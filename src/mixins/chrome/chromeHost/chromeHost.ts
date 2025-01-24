import { CSSResultGroup, CSSResultOrNative, html, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { Component } from "../../mixins";
import { ChromeProviderKey, ChromeTemplate, WithChromeProvider } from "../chromeProvider/chromeProvider";
import { createContext, provide } from "@lit/context";
import { UnitConverter } from "../../../models/unitConverters";
import { AbstractComponent } from "../../abstractComponent";
import { map } from "lit/directives/map.js";
import chromeHostStyles from "./style.css?inline";

export interface ChromeAdvertisement {
  unitConverter: UnitConverter;
  connect(provider: WithChromeProvider): void;
  disconnect(provider: WithChromeProvider): void;
}

export interface ChromeHostSurface {
  surface(): TemplateResult;
}

export const chromeAdvertisementContext = createContext<ChromeAdvertisement>("chrome-advertisement");

export const ChromeHost = <T extends Component>(superClass: T) => {
  class ChromeHostComponentClass extends superClass {
    @provide({ context: chromeAdvertisementContext })
    protected chromeAdvertisement!: ChromeAdvertisement;

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

    private providers = new Set<WithChromeProvider>();
    private unitConverter!: UnitConverter;

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);

      this.chromeAdvertisement = {
        unitConverter: this.getUnitConverter(),
        connect: this.connect,
        disconnect: this.disconnect,
      };
    }

    private connect(provider: WithChromeProvider): void {
      this.providers.add(provider);
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
          return provider[key];
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
            ${componentTemplate}
          </div>
        </div>
      `;
    }
  }

  return AbstractComponent(ChromeHostComponentClass as Component);
};
