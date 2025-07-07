import { Page } from "@playwright/test";
import { waitForContentReady } from "../../../tests/helpers";
import { html } from "lit";
import { IChromeProvider } from "../chromeProvider/chromeProvider";
import { createFixture } from "../../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public hostComponent = () => this.page.locator("oe-tests-chrome-host").first();
  public providerComponent = () => this.page.locator("oe-tests-chrome-provider").first();

  public async create() {
    await this.page.setContent(`
      <oe-tests-chrome-provider>
        <oe-tests-chrome-host></oe-tests-chrome-host>
      </oe-tests-chrome-provider>
    `);

    await this.providerComponent().evaluate((element: HTMLElement & IChromeProvider) => {
      element.chromeTop = () => html`<div id="test-chrome-top">Top Chrome</div>`;
      element.chromeBottom = () => html`<div id="test-chrome-bottom">Bottom Chrome</div>`;
      element.chromeLeft = () => html`<div id="test-chrome-left">Left Chrome</div>`;
      element.chromeRight = () => html`<div id="test-chrome-right">Right Chrome</div>`;
    });

    await waitForContentReady(this.page, ["oe-tests-chrome-provider", "oe-tests-chrome-host"]);
  }
}

export const chromeHostFixture = createFixture(TestPage);
