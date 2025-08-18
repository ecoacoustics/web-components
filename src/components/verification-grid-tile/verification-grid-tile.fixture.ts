import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-verification-grid-tile").first();
  public tileContainer = () => this.component().locator(".tile-container").first();

  public async create(content?: string) {
    // The verification grid exists in this test fixture so that we don't have
    // to mock the "settings" context.
    //
    // TODO: Figure out how to mock the settings context and remove the
    // verification grid component.
    const defaultContent = `
      <oe-verification-grid grid-size="1">
        <oe-verification-grid-tile></oe-verification-grid-tile>
      </oe-verification-grid>
    `;

    await setContent(this.page, content ?? defaultContent);
    await waitForContentReady(this.page, ["oe-verification-grid-tile"]);
  }
}

export const verificationGridTileFixture = createFixture(TestPage);
