import { Page } from "@playwright/test";
import { createFixture, setContent } from "../../tests/fixtures";
import { waitForContentReady } from "../../tests/helpers/helpers";
import { TypeaheadCallback, TypeaheadComponent } from "./typeahead";
import { Tag } from "../../models/tag";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-typeahead").first();
  public inputBox = () => this.page.locator("#typeahead-input").first();
  public searchResults = () => this.page.locator(".typeahead-result-action");

  public async create() {
    await setContent(this.page, `<oe-typeahead text-converter="(tag) => tag.text"></oe-typeahead>`);
    await this.component().evaluate((element: TypeaheadComponent) => {
      const testedTags: Tag[] = [
        { text: "Abbots Babbler" },
        { text: "Brush Turkey" },
        { text: "Noisy Miner" },
        { text: "tag1" },
        { text: "tag2" },
        { text: "tag3" },
        { text: "tag4" },
      ];

      const searchCallback: TypeaheadCallback<Tag> = (searchTerm: string) =>
        testedTags.filter((option) => option.text.includes(searchTerm));

      element.search = searchCallback;
    });

    await waitForContentReady(this.page, ["oe-typeahead"]);
  }
}

export const typeaheadFixture = createFixture(TestPage);
