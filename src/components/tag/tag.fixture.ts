import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers/helpers";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-tag").first();

  public async create(content: string) {
    await setContent(this.page, content);
    await waitForContentReady(this.page);
  }
}

export const tagsFixture = createFixture(TestPage);
