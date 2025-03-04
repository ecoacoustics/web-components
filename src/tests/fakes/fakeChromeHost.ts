import { LitElement } from "lit";
import { ChromeHost } from "../../mixins/chrome/chromeHost/chromeHost";
import { customElement } from "lit/decorators.js";

export function generateChromeHost() {
  @customElement("oe-tests-chrome-host")
  class MockChromeHost extends ChromeHost(LitElement) {}

  return new MockChromeHost();
}
