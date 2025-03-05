import { LitElement } from "lit";
import { ChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";
import { ChromeTemplate } from "../../mixins/chrome/types";
import { customElement } from "lit/decorators.js";

@customElement("oe-tests-chrome-provider")
export class MockChromeProvider extends ChromeProvider(LitElement) {
  public chromeTop?(): ChromeTemplate;
  public chromeBottom?(): ChromeTemplate;
  public chromeLeft?(): ChromeTemplate;
  public chromeRight?(): ChromeTemplate;
}
