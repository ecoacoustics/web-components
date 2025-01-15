import { Size } from "../../models/rendering";
import { expect } from "../../tests/assertions";
import { getBrowserValue, setBrowserAttribute } from "../../tests/helpers";
import { AnnotateComponent, AnnotationTagStyle } from "./annotate";
import { annotateFixture as test } from "./annotate.fixture";

test.describe("with annotations", () => {
  test("should correctly size all slotted content", async ({ fixture }) => {
    await fixture.create();

    const spectrogramSize = await fixture.spectrogram().boundingBox();
    const componentSize = await fixture.component().boundingBox();

    expect(spectrogramSize).toEqual(componentSize);
  });

  test.describe("bounding boxes", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should correctly place the bounding boxes", async ({ fixture }) => {
      const expectedBoundingBoxes = [] satisfies Size[];

      const boundingBoxes = await fixture.annotationBoundingBoxes();
      const realizedBoundingBoxes = Promise.all(boundingBoxes.map(async (locator) => await locator.boundingBox()));

      expect(realizedBoundingBoxes).toEqual(expectedBoundingBoxes);
    });

    test("should correctly resize the bounding box if an annotation updates", () => {});

    test("should correctly remove an annotation when removed", () => {});
  });

  test.describe("headings", () => {
    test("should have the correct headings", () => {});

    test("should correctly render slotted content", () => {});

    test("should correctly update if the heading changes", () => {});

    test("should correctly update if a heading is removed", () => {});
  });

  test.describe("annotation style tag", () => {
    test.beforeEach(() => {});

    test.describe("initial styles", () => {
      test("should use the correct default tag style", async ({ fixture }) => {
        await fixture.create();

        const expectedTagStyle = AnnotationTagStyle.EDGE;
        const realizedTagStyle = await getBrowserValue<AnnotateComponent>(fixture.component(), "tagStyle");

        expect(realizedTagStyle).toBe(expectedTagStyle);
      });

      test("should have the correct 'hidden' attribute behavior", async ({ fixture }) => {
        await fixture.createWithTagStyle(AnnotationTagStyle.HIDDEN);
      });

      test("should have the correct 'edge' behavior", async ({ fixture }) => {
        await fixture.createWithTagStyle(AnnotationTagStyle.EDGE);
      });

      test("should have the correct 'spectrogram-top' behavior", async ({ fixture }) => {
        await fixture.createWithTagStyle(AnnotationTagStyle.SPECTROGRAM_TOP);
      });
    });

    test.describe("updating attributes", () => {
      test("should correctly update if the tag style is updated to 'hidden'", async ({ fixture }) => {
        await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "hidden");
      });

      test("should correctly update if the tag style is updated to 'edge'", async ({ fixture }) => {
        await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "edge");
      });

      test("should correctly update if the tag style is updated to 'spectrogram-top'", async ({ fixture }) => {
        await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "spectrogram-top");
      });
    });

    test.describe("slotted tag content", () => {
      test("should reflect slotted tag content correctly in hidden style", () => {});

      test("should reflect slotted tag content correctly in edge style", () => {});

      test("should reflect slotted tag content correctly in 'spectrogram-top' style", () => {});
    });
  });
});

test.describe("without annotations", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithoutAnnotations();
  });

  test("should have any annotations", async ({ fixture }) => {
    expect(await fixture.annotationContainers()).toHaveLength(0);
  });

  test("should correctly size all slotted content", async ({ fixture }) => {
    const spectrogramSize = await fixture.spectrogram().boundingBox();
    const componentSize = await fixture.component().boundingBox();
    expect(spectrogramSize).toEqual(componentSize);
  });
});

test.describe("overflowing annotations", () => {
  test.describe("label positioning", () => {});

  test.describe("bounding box positioning", () => {});
});

test.describe("overlapping annotations", () => {
  test.describe("overlapping labels", () => {});

  test.describe("bounding boxes", () => {});
});
