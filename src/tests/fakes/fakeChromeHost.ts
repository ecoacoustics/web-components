import { html, LitElement } from "lit";
import { ChromeHost } from "../../mixins/chrome/chromeHost/chromeHost";
import { customElement } from "lit/decorators.js";

@customElement("oe-tests-chrome-host")
export class MockChromeHost extends ChromeHost(LitElement) {
  public renderSurface() {
    return html`<p>This is surface content</p>`;
  }
}
