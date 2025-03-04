import { Page } from "@playwright/test";
import { test } from "../../../tests/assertions";
import { waitForContentReady } from "../../../tests/helpers";
import { generateChromeHost } from "../../../tests/fakes/fakeChromeHost";
import { generateChromeProvider } from "../../../tests/fakes/fakeChromeProvider";
import { html } from "lit";

class ChromeHostFixture {
  public constructor(public readonly page: Page) {}

  public hostComponent = () => this.page.locator("oe-tests-chrome-host").first();
  public providerComponent = () => this.page.locator("oe-tests-chrome-provider").first();

  public async create() {
    generateChromeProvider({
      chromeTop: () => html`<div id="test-chrome-top">Top Chrome</div>`,
      chromeBottom: () => html`<div id="test-chrome-bottom">Bottom Chrome</div>`,
      chromeLeft: () => html`<div id="test-chrome-left">Left Chrome</div>`,
      chromeRight: () => html`<div id="test-chrome-right">Right Chrome</div>`,
    });
    const mockHost = generateChromeHost();

    await this.page.setContent(`
      <oe-tests-chrome-provider>
        <oe-tests-chrome-host></oe-tests-chrome-host>
      </oe-tests-chrome-provider>
    `);
    await waitForContentReady(this.page);

    return mockHost;
  }
}

export const chromeHostFixture = test.extend<{ fixture: ChromeHostFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new ChromeHostFixture(page);
    await run(fixture);
  },
});
