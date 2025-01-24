import { HTMLTemplateResult, PropertyValues } from "lit";
import { Component } from "../../mixins";
import { ChromeAdvertisement, chromeAdvertisementContext } from "../chromeHost/chromeHost";
import { consume } from "@lit/context";
import { property } from "lit/decorators.js";
import { AbstractComponent } from "../../abstractComponent";

export type ChromeTemplate = HTMLTemplateResult;

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
    @consume({ context: chromeAdvertisementContext, subscribe: true })
    @property({ attribute: false })
    public chromeAdvertisement?: ChromeAdvertisement;

    private handleChromeAdvertisement(): void {
      if (!this.chromeAdvertisement) {
        return;
      }

      this.chromeAdvertisement.connect(this as any);
    }

    public firstUpdated(change: PropertyValues<this>): void {
      super.firstUpdated(change);
      this.handleChromeAdvertisement();
    }
  }

  return AbstractComponent(ChromeProviderComponentClass as Component);
};
