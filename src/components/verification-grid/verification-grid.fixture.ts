import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { setBrowserAttribute } from "../../tests/helpers";
import { VerificationGridComponent } from "./verification-grid";

class VerificationGridFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid");
  public templateElements = () => this.component().locator(".template-element").all();

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid>
        <template>
          <div class="template-element"></div>
        </template>

        <oe-data-source src="http://localhost:3000/grid-items.json">
        </oe-data-source>
      </oe-verification-grid>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-verification-grid");
  }

  public async createWithDecisionElements() {
    await this.page.setContent(`
      <oe-verification-grid>
        <template>
          <div class="template-element"></div>
        </template>

        <oe-decision verified="true" tag="koala" shortcut="Y">Koala</oe-decision>
        <oe-decision verified="false" tag="koala" shortcut="N">Not Koala</oe-decision>

        <oe-data-source src="http://localhost:3000/grid-items.json">
        </oe-data-source>
      </oe-verification-grid>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-verification-grid");
  }

  public async setGridSize(value: number) {
    await setBrowserAttribute(this.component(), "grid-size" as keyof VerificationGridComponent, value.toString());
  }
}

export const verificationGridFixture = test.extend<{ fixture: VerificationGridFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new VerificationGridFixture(page);
    await run(fixture);
  },
});
