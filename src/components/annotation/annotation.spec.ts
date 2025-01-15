import { test } from "../../tests/assertions";

test.describe("model parsing", () => {
  test("should throw an error if no bounding attributes are present", () => {});

  test("should throw an error if an attribute is not a number", () => {});

  test("should issue a warning if all attributes are empty", () => {});

  test("should throw an error if only one attribute is missing", () => {});

  test("should not throw an error only tags are missing", () => {});

  test("should return the correct model if all attributes are present", () => {});

  // we expect that the model is returned without modification because clamping
  // the bounding box is the responsibility of the AnnotateComponent
  test("should return the correct model if the bounding box is outside of the spectrogram", () => {});
});

test.describe("tag parsing", () => {
  test.describe("attributes", () => {
    test("should correctly parse an empty tag", () => {});

    test("should correctly parse a single tag", () => {});

    test("should correctly parse a multiple tag", () => {});
  });

  test.describe("slotted tags", () => {
    test("should correctly parse an empty tag component", () => {});

    test("should correctly parse a tag component with an empty value", () => {});

    test("should correctly parse a fully formed tag component", () => {});

    test("should correctly multiple tag components", () => {});

    test("should correctly multiple tags where some have no value", () => {});
  });

  test.describe("property tags", () => {
    test("should correctly assign tags through the property", () => {});
  });

  test.describe("attribute and slotted tags", () => {
    test("should combine attribute and slotted tag models", () => {});

    test("should correctly combine slotted tags and an empty attribute", () => {});
  });
});
