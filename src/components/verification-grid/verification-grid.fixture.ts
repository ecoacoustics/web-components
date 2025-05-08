import { Page } from "@playwright/test";
import { setBrowserAttribute, waitForContentReady } from "../../tests/helpers";
import { VerificationGridComponent } from "./verification-grid";
import { test } from "../../tests/assertions";

class VerificationGridFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid");
  public templateElements = () => this.component().locator(".template-element").all();

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid">
        <template>
          <div class="template-element"></div>
        </template>

        <oe-data-source
          src="http://localhost:3000/test-items.json"
          for="verification-grid"
        ></oe-data-source>
      </oe-verification-grid>
    `);
    await waitForContentReady(this.page, ["oe-verification-grid", "oe-verification-grid-tile", "oe-data-source"]);
  }

  public async createWithDecisionElements() {
    await this.page.setContent(`
      <oe-verification-grid id="verification-grid">
        <template>
          <div class="template-element"></div>
        </template>

        <oe-verification verified="true" shortcut="Y">Koala</oe-verification>
        <oe-verification verified="false" shortcut="N">Not Koala</oe-verification>

        <oe-data-source
          src="http://localhost:3000/test-items.json"
          for="verification-grid"
        ></oe-data-source>
      </oe-verification-grid>
    `);
    await waitForContentReady(this.page, [
      "oe-verification-grid",
      "oe-verification-grid-tile",
      "oe-data-source",
      "oe-verification",
    ]);
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
