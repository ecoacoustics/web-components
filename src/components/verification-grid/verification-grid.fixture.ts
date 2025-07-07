import { Page } from "@playwright/test";
import { setBrowserAttribute, waitForContentReady } from "../../tests/helpers";
import { VerificationGridComponent } from "./verification-grid";
import { expect } from "../../tests/assertions";
import { createFixture } from "../../tests/fixtures";

class TestPage {
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

    // By having an except statement here, playwright will continue running this
    // assertion until it passes or the test times out (30 seconds).
    // We do this so that we know the entire grid has loaded.
    await expect(this.component()).toHaveJSProperty("loaded", true);
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
      ".decision-button",
    ]);

    await expect(this.component()).toHaveJSProperty("loaded", true);
  }

  public async setGridSize(value: number) {
    await setBrowserAttribute(this.component(), "grid-size" as keyof VerificationGridComponent, value.toString());
  }
}

export const verificationGridFixture = createFixture(TestPage);
