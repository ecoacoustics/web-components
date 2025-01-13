import { Tag } from "../../models/tag";
import { expect } from "../../tests/assertions";
import { getBrowserValue } from "../../tests/helpers";
import { TagComponent } from "./tag";
import { tagsFixture as test } from "./tag.fixture";

test.describe("tag models", () => {
  test("should create the correct model if it contains a value", async ({ fixture }) => {
    const testedTag = "Koala";

    await fixture.create(`<oe-tag>${testedTag}</oe-tag>`);

    const expectedTagModel = { text: testedTag } satisfies Tag;
    const realizedTagModel = await getBrowserValue<TagComponent>(fixture.component(), "model");

    expect(realizedTagModel).toEqual(expectedTagModel);
  });

  test("should create the correct model if it does not have a value", async ({ fixture }) => {
    await fixture.create("<oe-tag></oe-tag>");

    const expectedTagModel = { text: "" } satisfies Tag;
    const realizedTagModel = await getBrowserValue<TagComponent>(fixture.component(), "model");

    expect(realizedTagModel).toEqual(expectedTagModel);
  });
});
