import { adoptStyles, CSSResultGroup, html, LitElement, nothing, PropertyValues, RootPart, unsafeCSS } from "lit";
import { Component } from "../../../helpers/types/mixins";
import { AbstractComponent } from "../../abstractComponent";
import { map } from "lit/directives/map.js";
import { state } from "lit/decorators.js";
import { ChromeTemplate } from "../types";
import { addStyleSheets } from "../../../helpers/styles/add";
import { removeStyleSheets } from "../../../helpers/styles/remove";
import { IChromeProvider } from "../chromeProvider/chromeProvider";
import chromeHostStyles from "./style.css?inline";

export interface ChromeAdvertisement {
  connect(provider: IChromeProvider): void;
  disconnect(provider: IChromeProvider): void;
  requestUpdate(): void;
}

export const chromeAdvertisementEventName = "oe-chrome-advertisement";

export const ChromeHost = <T extends Component>(superClass: T) => {
  abstract class ChromeHostComponentClass extends superClass {
    @state()
    private providers = new Set<IChromeProvider>();

    /**
     * The content to render chrome around.
     * Replaces render on the ChromeHost.
     */
    public abstract renderSurface(): RootPart;

    public connectedCallback(): void {
      super.connectedCallback();
      adoptStyles(this.shadowRoot as ShadowRoot, [
        unsafeCSS(chromeHostStyles),
        ...(this.shadowRoot?.adoptedStyleSheets ?? []),
      ]);
    }

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
      this.sendChromeHostAdvertisement();
    }

    public updated(): void {
      this.providers.forEach((provider) => provider.chromeRendered?.());
    }

    private sendChromeHostAdvertisement(): void {
      const chromeAdvertisement = {
        connect: (provider: IChromeProvider) => this.connect(provider),
        disconnect: (provider: IChromeProvider) => this.disconnect(provider),
        requestUpdate: () => this.requestUpdate(),
      } as const satisfies ChromeAdvertisement;

      this.dispatchEvent(
        new CustomEvent<ChromeAdvertisement>(chromeAdvertisementEventName, {
          detail: chromeAdvertisement,
          bubbles: true,
        }),
      );
    }

    private connect(provider: IChromeProvider): void {
      if (!(provider instanceof LitElement)) {
        console.error("Attempted to attach non-lit element to ChromeHost");
        return;
      }

      // we add the providers style sheets to the host first so that when the
      // providers template is rendered, the stylesheets are guaranteed to be
      // present and there won't be a flash of unstyled content or cumulative
      // shift
      const styles = this.getProviderStyleSheets(provider);
      addStyleSheets(this, styles);

      this.providers.add(provider);

      this.requestUpdate();
    }

    private disconnect(provider: IChromeProvider): void {
      const styles = this.getProviderStyleSheets(provider);

      // we remove the providers style sheets last so that there is not a flash
      // of unstyled content when the provider is removed
      this.providers.delete(provider);
      removeStyleSheets(this, styles);
    }

    private getProviderStyleSheets(provider: IChromeProvider): CSSResultGroup {
      const providerClass = provider.constructor as typeof LitElement;
      return providerClass.styles ?? [];
    }

    private providerTemplate(key: keyof IChromeProvider): ChromeTemplate {
      return html`${map(this.providers, (provider) => {
        if (typeof provider[key] === "function") {
          return (provider[key] as any)();
        }

        return nothing;
      })}`;
    }

    public render() {
      if (!this.renderSurface) {
        console.error("ChromeHost must implement renderSurface");
        return nothing;
      }

      const componentTemplate = this.renderSurface();

      return html`
        <div id="chrome-wrapper">
          <div class="chrome chrome-edge chrome-top">${this.providerTemplate("chromeTop")}</div>
          <div class="chrome chrome-edge chrome-bottom">${this.providerTemplate("chromeBottom")}</div>
          <div class="chrome chrome-edge chrome-left">${this.providerTemplate("chromeLeft")}</div>
          <div class="chrome chrome-edge chrome-right">${this.providerTemplate("chromeRight")}</div>

          <div class="surface">
            <div class="chrome chrome-overlay">${this.providerTemplate("chromeOverlay")}</div>
            <div class="host-template">${componentTemplate}</div>
          </div>
        </div>
      `;
    }
  }

  return AbstractComponent(ChromeHostComponentClass);
};
