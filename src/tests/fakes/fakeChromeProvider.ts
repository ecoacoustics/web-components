import { LitElement } from "lit";
import { ChromeProvider, IChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
import { customElement } from "lit/decorators.js";

/** Generates a fake chrome provider for testing purposes */
export function generateChromeProvider(provider: IChromeProvider): IChromeProvider {
  @customElement("oe-tests-chrome-provider")
  class MockChromeProvider extends ChromeProvider(LitElement) {
    public chromeTop?(): ChromeTemplate;
    public chromeBottom?(): ChromeTemplate;
    public chromeLeft?(): ChromeTemplate;
    public chromeRight?(): ChromeTemplate;
  }

  const mockProvider = new MockChromeProvider();

  // if these callbacks are not provided on the "provider" argument, they will
  // be undefined, which behaves the same as if they were not implemented
  mockProvider.chromeTop = provider.chromeTop;
  mockProvider.chromeBottom = provider.chromeBottom;
  mockProvider.chromeLeft = provider.chromeLeft;
  mockProvider.chromeRight = provider.chromeRight;

  return new MockChromeProvider();
}
