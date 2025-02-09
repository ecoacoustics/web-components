import { CSSResultGroup, CSSResultOrNative, html, LitElement, nothing, PropertyValues, RootPart } from "lit";
import { Component } from "../../mixins";
import { AbstractComponent } from "../../abstractComponent";
import { map } from "lit/directives/map.js";
import { state } from "lit/decorators.js";
import { ChromeTemplate } from "../types";
import { mergeStyles } from "../../../helpers/styles/merge";
import { addStyleSheets } from "../../../helpers/styles/add";
import { removeStyleSheets } from "../../../helpers/styles/remove";
import chromeHostStyles from "./style.css?inline";

// TODO: improve typing here
export interface ChromeAdvertisement {
  connect(provider: any): void;
  disconnect(provider: any): void;
  requestUpdate(): void;
}

export const chromeAdvertisementEventName = "oe-chrome-advertisement";

export const ChromeHost = <T extends Component>(superClass: T) => {
  abstract class ChromeHostComponentClass extends superClass {
    public static finalizeStyles(styles?: CSSResultGroup): Array<CSSResultOrNative> {
      const newStyles: CSSResultGroup = mergeStyles([chromeHostStyles], styles);

      // eslint-disable-next-line
      // @ts-ignore
      return super.finalizeStyles(newStyles);
    }

    @state()
    private providers = new Set<any>();

    /**
     * The content to render chrome around.
     * Replaces render on the ChromeHost.
     */
    public abstract renderSurface(): RootPart;

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
      this.sendChromeHostAdvertisement();
    }

    public updated(): void {
      this.providers.forEach((provider) => provider.chromeRendered?.());
    }

    private sendChromeHostAdvertisement(): void {
      const chromeAdvertisement = {
        connect: (provider: ChromeHostComponentClass) => this.connect(provider),
        disconnect: (provider: ChromeHostComponentClass) => this.disconnect(provider),
        requestUpdate: () => this.requestUpdate(),
      } satisfies ChromeAdvertisement;

      this.dispatchEvent(
        new CustomEvent<ChromeAdvertisement>(chromeAdvertisementEventName, {
          detail: chromeAdvertisement,
          bubbles: true,
        }),
      );
    }

    private connect(provider: ChromeHostComponentClass): void {
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
      // this.addStyleSheets(styles);

      this.providers.add(provider);

      this.requestUpdate();
    }

    private disconnect(provider: ChromeHostComponentClass): void {
      const styles = this.getProviderStyleSheets(provider);

      // we remove the providers style sheets last so that there is not a flash
      // of unstyled content when the provider is removed
      this.providers.delete(provider);
      removeStyleSheets(this, styles);
    }

    private getProviderStyleSheets(provider: ChromeHostComponentClass): CSSResultGroup {
      const providerClass = provider.constructor as typeof LitElement;
      return providerClass.styles ?? [];
    }

    // TODO: improve typing here
    private providerTemplate(key: any): ChromeTemplate {
      return html`${map(this.providers, (provider: any) => {
        if (typeof provider[key] === "function") {
          return provider[key]();
        }

        return nothing;
      })}`;
    }

    public render() {
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

  return AbstractComponent(ChromeHostComponentClass as Component);
};
