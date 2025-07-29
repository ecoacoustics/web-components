import { Page } from "@playwright/test";
import { createFixture, setContent } from "../../tests/fixtures";
import { waitForContentReady } from "../../tests/helpers";
import { TypeaheadCallback } from "./typeahead";
import { Tag } from "../../models/tag";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-typeahead");

  public async create(search: TypeaheadCallback<Tag>) {
    await setContent(
      this.page,
      `<oe-typeahead
        search="${search.toString()}"
        text-converter="(tag) => tag.text"
      ></oe-typeahead>`,
    );

    await waitForContentReady(this.page, ["oe-typeahead"]);
  }
}

export const typeaheadFixture = createFixture(TestPage);
