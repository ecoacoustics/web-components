import { Tag } from "../../models/tag";
import { expect } from "../../tests/assertions";
import { getBrowserValue, setBrowserValue } from "../../tests/helpers";
import { TagComponent } from "./tag";
import { tagsFixture as test } from "./tag.fixture";

test.describe("component template", () => {
  test("should not display any slotted content", async ({ fixture }) => {
    // To really push this test to its limit, I have set the display: block and
    // visibility: visible properties on the slotted content.
    // This is to validate that the component is not hiding slotted content by
    // modifying the styles of the slotted content.
    await fixture.create(`
      <oe-tag>
        <strong style="display: block; visibility: visible;">
          This should not be visible
        </strong>
      </oe-tag>
    `);

    await expect(fixture.component()).not.toBeVisible();
  });
});

test.describe("tag models", () => {
  test("should create the correct model if it contains a value", async ({ fixture }) => {
    const testedTag = "Koala";

    await fixture.create(`<oe-tag value="${testedTag}">${testedTag}</oe-tag>`);

    const expectedTagModel = { text: testedTag } satisfies Tag;
    const realizedTagModel = await getBrowserValue<TagComponent>(fixture.component(), "model");

    expect(realizedTagModel).toEqual(expectedTagModel);
  });

  test("should create the correct model if it does not have a value", async ({ fixture }) => {
    // while this component does have slotted text, it does not have a value
    // attribute. Therefore, we expect that the default value will take over
    // with an empty string.
    await fixture.create("<oe-tag>Koala</oe-tag>");

    const expectedTagModel = { text: "" } satisfies Tag;
    const realizedTagModel = await getBrowserValue<TagComponent>(fixture.component(), "model");

    expect(realizedTagModel).toEqual(expectedTagModel);
  });

  test("should update the model if the value changes", async ({ fixture }) => {
    const testedTag = "Koala";
    const updatedTag = "Panda";

    await fixture.create(`<oe-tag value="${testedTag}">${testedTag}</oe-tag>`);
    await setBrowserValue<TagComponent>(fixture.component(), "value", updatedTag);

    const expectedTagModel = { text: updatedTag } satisfies Tag;
    const realizedTagModel = await getBrowserValue<TagComponent>(fixture.component(), "model");

    expect(realizedTagModel).toEqual(expectedTagModel);
  });
});
