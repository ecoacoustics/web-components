import { CSSResultGroup, CSSResultOrNative, html, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { Component } from "../../mixins";
import { ChromeProviderKey, ChromeTemplate, WithChromeProvider } from "../chromeProvider/chromeProvider";
import { AbstractComponent } from "../../abstractComponent";
import { map } from "lit/directives/map.js";
import { state } from "lit/decorators.js";
import chromeHostStyles from "./style.css?inline";

export interface ChromeAdvertisement {
  connect(provider: WithChromeProvider): void;
  disconnect(provider: WithChromeProvider): void;
  requestUpdate(): void;
}

export interface ChromeHostSurface {
  surface(): ChromeTemplate;
}

export const chromeAdvertisementEventName = "oe-chrome-advertisement";

export const ChromeHost = <T extends Component>(superClass: T) => {
  abstract class ChromeHostComponentClass extends superClass implements ChromeHostSurface {
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

    /**
     * A template that will have chrome added to it
     * You must provide an implementation of the surface() method to use a
     * ChromeHost mixin
     */
    public abstract surface(): ChromeTemplate;

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);

      const chromeAdvertisement = {
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
      // we add the providers style sheets to the host first so that when the
      // providers template is rendered, the stylesheets are guaranteed to be
      // present and there won't be a flash of unstyled content or cumulative
      // shift
      const styles = this.getProviderStyleSheets(provider);
      this.addStyleSheets(styles);

      this.providers.add(provider);

      this.requestUpdate();
    }

    private disconnect(provider: WithChromeProvider): void {
      const styles = this.getProviderStyleSheets(provider);

      // we remove the providers style sheets last so that there is not a flash
      // of unstyled content when the provider is removed
      this.providers.delete(provider);
      this.removeStyleSheets(styles);
    }

    private getProviderStyleSheets(provider: WithChromeProvider): CSSResultGroup {
      if (!(provider instanceof LitElement)) {
        console.error("Attempted to attach non-lit element to ChromeHost");
        return [];
      }

      const providerClass = provider.constructor as typeof LitElement;
      return providerClass.styles ?? [];
    }

    private addStyleSheets(styleSheets: CSSResultGroup): void {
      if (Array.isArray(styleSheets)) {
        for (const style of styleSheets) {
          if (Array.isArray(style)) {
            this.addStyleSheets(style);
          } else {
            this.addStyleSheet(style);
          }
        }

        return;
      }

      this.addStyleSheet(styleSheets);
    }

    private removeStyleSheets(styleSheets: CSSResultGroup): void {
      if (Array.isArray(styleSheets)) {
        for (const style of styleSheets) {
          if (Array.isArray(style)) {
            this.removeStyleSheets(style);
          } else {
            this.removeStyleSheet(style);
          }
        }
      }
    }

    private addStyleSheet(styleSheet: CSSResultOrNative): void {
      if (styleSheet instanceof CSSStyleSheet) {
        this.shadowRoot?.adoptedStyleSheets.push(styleSheet);
      } else {
        this.shadowRoot?.adoptedStyleSheets.push((styleSheet as any).styleSheet);
      }
    }

    private removeStyleSheet(styleSheet: CSSResultOrNative): void {
      const currentStyles = this.shadowRoot?.adoptedStyleSheets;
      if (!currentStyles) {
        return;
      }

      const styleSheetObject = styleSheet instanceof CSSStyleSheet ? styleSheet : styleSheet.styleSheet;
      if (!styleSheetObject) {
        return;
      }

      const indexToRemove = currentStyles.indexOf(styleSheetObject);
      if (indexToRemove < 0) {
        return;
      }

      this.shadowRoot.adoptedStyleSheets.splice(indexToRemove, 1);
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
      const componentTemplate = this.surface();

      return html`
        <div id="chrome-wrapper">
          <div class="chrome chrome-edge chrome-top">${this.providerTemplate("chromeTop")}</div>
          <!-- <div class="chrome chrome-edge chrome-bottom">${this.providerTemplate("chromeBottom")}</div> -->
          <!-- <div class="chrome chrome-edge chrome-left">${this.providerTemplate("chromeLeft")}</div> -->
          <div class="chrome chrome-edge chrome-right">${this.providerTemplate("chromeRight")}</div>

          <div class="surface">
            <div class="chrome chrome-overlay">${this.providerTemplate("chromeOverlay")}</div>
            <div class="host-template">${componentTemplate}</div>
          </div>
        </div>
      `;
    }
  }

  return AbstractComponent(ChromeHostComponentClass as Component);
};
