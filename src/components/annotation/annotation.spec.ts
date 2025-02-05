import { Tag } from "../../models/tag";
import { expect } from "../../tests/assertions";
import { setBrowserValue } from "../../tests/helpers";
import { annotationFixture as test } from "./annotation.fixture";

// because we don't want to assert the elementReference array, we just assert
// the tag text and reference properties
function assertTagModels(expected: ReadonlyArray<Tag>, realized: ReadonlyArray<Tag>) {
  for (const i in expected) {
    const expectedTag = expected[i];
    const realizedTag = realized[i];

    expect(realizedTag.text).toEqual(expectedTag.text);
    expect(realizedTag.reference).toEqual(expectedTag.reference);
  }
}

test.describe("component template", () => {
  test("should not display any content", async ({ fixture }) => {
    // To really push this test to its limit, I have set the display: block and
    // visibility: visible properties on the slotted content.
    // This is to validate that the component is not hiding slotted content by
    // modifying the styles of the slotted content.
    await fixture.create(`
      <oe-annotation
        tags="you should not see this"
        low-frequency="0"
        high-frequency="1000"
        start-time="0"
        end-time="5"
        style="display: block; visibility: visible;"
      >
        <oe-tag value="koala" style="display: block; visibility: visible;">you should not see this tag</oe-tag>
        <strong style="display: block; visibility: visible;">you should not see this element</strong>
      </oe-annotation>
    `);

    await expect(fixture.component()).not.toBeVisible();
  });
});

test.describe("model parsing", () => {
  test.fail("should throw an error if bounding attributes are missing", async ({ fixture }) => {
    await fixture.create("<oe-annotation></oe-annotation>");
  });

  test("should not throw an error only tags are missing", async ({ fixture }) => {
    // if creating the component (through fixture.create) throws an error, the
    // test will fail
    await fixture.create(`
      <oe-annotation
        low-frequency="0"
        high-frequency="1000"
        start-time="0"
        end-time="5"
      ></oe-annotation>
    `);

    // assert that the correct model is returned if there are no tags
    const realizedTags = await fixture.tagModels();
    expect(realizedTags).toEqual([]);
  });

  test("should return the correct model if all attributes are present", async ({ fixture }) => {
    const testTag = { text: "koala" } as const satisfies Tag;
    const testAnnotation = {
      startOffset: 0,
      endOffset: 5,
      lowFrequency: 0,
      highFrequency: 1000,
      tags: [testTag],
      reference: {},
      verifications: [],
    } as const;

    await fixture.create(`
      <oe-annotation
        tags="${testTag.text}"
        low-frequency="${testAnnotation.lowFrequency}"
        high-frequency="${testAnnotation.highFrequency}"
        start-time="${testAnnotation.startOffset}"
        end-time="${testAnnotation.endOffset}"
      ></oe-annotation>
    `);

    await fixture.assertAnnotationModel(testAnnotation);

    const expectedTagModels = [testTag];
    const realizedTagModels = await fixture.tagModels();
    expect(realizedTagModels).toEqual(expectedTagModels);
  });

  // we expect that the model is returned without modification because clamping
  // the bounding box is the responsibility of the AnnotateComponent
  test("should return the correct model if the bounding box is outside of the spectrogram", async ({ fixture }) => {
    const expectedAnnotation = {
      startOffset: -1,
      endOffset: 6,
      lowFrequency: 0,
      highFrequency: 1000,
      tags: [],
      reference: {},
      verifications: [],
    } as const;

    await fixture.create(`
      <oe-annotation
        low-frequency="${expectedAnnotation.lowFrequency}"
        high-frequency="${expectedAnnotation.highFrequency}"
        start-time="${expectedAnnotation.startOffset}"
        end-time="${expectedAnnotation.endOffset}"
      ></oe-annotation>
    `);

    await fixture.assertAnnotationModel(expectedAnnotation);
  });
});

test.describe("tag parsing", () => {
  test.describe("attributes", () => {
    // empty tag parsing was already tested above in the "model parsing" test
    // "should not throw an error only tags are missing"

    // additionally, testing a single tag attribute was already tested in
    // "should return the correct model if all attributes are present"

    test("should correctly parse a multiple tag", async ({ fixture }) => {
      await fixture.create(`
        <oe-annotation
          tags="koala,kangaroo"
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        ></oe-annotation>
      `);

      const realizedTags = await fixture.tagModels();
      expect(realizedTags).toEqual([{ text: "koala" }, { text: "kangaroo" }]);
    });
  });

  test.describe("slotted tags", () => {
    // testing parsing of an empty slot was already tested in
    // "should not throw an error only tags are missing"

    test("should correctly parse a tag component with an empty value", async ({ fixture }) => {
      const expectedTag = {
        text: "",
        reference: null,
      } as const satisfies Tag;

      await fixture.create(`
        <oe-annotation
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        >
          <oe-tag></oe-tag>
        </oe-annotation>
      `);

      const realizedTags = await fixture.tagModels();
      assertTagModels([expectedTag], realizedTags);
    });

    test("should correctly parse a fully formed tag component", async ({ fixture }) => {
      const expectedTag = {
        text: "koala",
        reference: null,
      } as const satisfies Tag;

      await fixture.create(`
        <oe-annotation
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        >
          <oe-tag value="${expectedTag.text}">
            this content should not effect the tag value
          </oe-tag>
        </oe-annotation>
      `);

      const realizedTags = await fixture.tagModels();
      assertTagModels([expectedTag], realizedTags);
    });

    test("should correctly multiple tag components", async ({ fixture }) => {
      await fixture.create(`
        <oe-annotation
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        >
          <oe-tag value="koala">1</oe-tag>
          <oe-tag value="kangaroo"></oe-tag>

          <!-- Notice that these two tags do not have a value -->
          <oe-tag>2</oe-tag>
          <oe-tag></oe-tag>
        </oe-annotation>
      `);

      const realizedTags = await fixture.tagModels();
      const expectedTags = [
        { text: "koala", reference: null },
        { text: "kangaroo", reference: null },
        { text: "", reference: null },
        { text: "", reference: null },
      ] as const satisfies Tag[];

      // prettier wants to combine all of these objects into a single line,
      // however, I think that it is more readable to have each object on its
      // own line that keeps under the 80 character limit
      // prettier-ignore
      assertTagModels(expectedTags, realizedTags);
    });
  });

  test.describe("property tags", () => {
    test("should correctly assign tags through the property", async ({ fixture }) => {
      await fixture.create(`
        <oe-annotation
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        ></oe-annotation>
      `);

      const expectedTags = [{ text: "koala" }];
      await setBrowserValue(fixture.component(), "tags", expectedTags);

      const realizedTags = await fixture.tagModels();
      expect(realizedTags).toEqual(expectedTags);
    });
  });

  // we expect that both the attribute and slotted tags are combined into a
  // single array of tags
  test.describe("attribute and slotted tags", () => {
    test("should combine attribute and slotted tag models", async ({ fixture }) => {
      // notice that in this test there is a comma between koala and fish
      // tags. This is to test that when combining the attribute and slotted
      // tags, the empty tag values are still included
      await fixture.create(`
        <oe-annotation
          tags="attribute-koala,,attribute-fish"
          low-frequency="0"
          high-frequency="1000"
          start-time="0"
          end-time="5"
        >
          <oe-tag value="slotted-kangaroo"></oe-tag>

          <!-- Notice that this tag does not have a value -->
          <oe-tag></oe-tag>
        </oe-annotation>
      `);

      // similar to the above prettier ignore, I have disabled prettier here
      // because I think that it is more readable to have each object on its own
      // line that keeps under the 80 character limit
      // prettier-ignore
      const expectedTags = [
        { text: "attribute-koala" },
        { text: "" },
        { text: "attribute-fish" },
        { text: "slotted-kangaroo" },
        { text: "" },
      ];
      const realizedTags = await fixture.tagModels();

      expect(realizedTags).toEqual(expectedTags);
    });
  });
});
