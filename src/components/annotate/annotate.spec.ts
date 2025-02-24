import { Annotation } from "../../models/annotation";
import { expect } from "../../tests/assertions";
import { getBrowserStyles, getBrowserValue, setBrowserAttribute, setBrowserValue } from "../../tests/helpers";
import { TagComponent } from "../tag/tag";
import { AnnotateComponent } from "./annotate";
import { annotateFixture as test } from "./annotate.fixture";

/**
 * A subset of an annotation should only be used to initialize annotations in
 * testing.
 */
export type PartialAnnotation = Pick<Annotation, "startOffset" | "endOffset" | "lowFrequency" | "highFrequency">;

interface AnnotationBoundingBoxTest {
  name: string;
  annotation: PartialAnnotation;
}

function createAnnotationTests(testsToRun: ReadonlyArray<AnnotationBoundingBoxTest>) {
  for (const spec of testsToRun) {
    test(spec.name, async ({ fixture }) => {
      await fixture.createWithAnnotation(spec.annotation);
      await fixture.onlyShowAnnotationOutline();
      await expect(fixture.bodyElement()).toHaveScreenshot();
    });
  }
}

test.describe("annotation", () => {
  test.describe("label content", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should have the correct label", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(0);
      await expect(labelTarget).toHaveTrimmedText("bird");
    });

    test("should correctly render slotted content", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(2);

      // because the second annotation contains two <oe-tag> components
      // we expect that the annotation label text will be the concatenation
      // of the two oe-tag content
      await expect(labelTarget).toHaveTrimmedText("Bat,Ultrasonic Slotted");
    });

    // TODO: this test is currently skipped because we do not support this type
    // of update in the current AbstractComponent implementation
    test.skip("should correctly update if the label content", async ({ fixture }) => {
      const tagTarget = await fixture.tagComponent(1);
      await setBrowserValue<TagComponent>(tagTarget, "textContent", "Subsonic");

      const labelTarget = await fixture.annotationLabel(2);
      await expect(labelTarget).toHaveTrimmedText("Bat,Subsonic");
    });
  });

  test.describe("in-view bounding boxes", () => {
    const tests = [
      {
        name: "should correctly place correct bounding boxes",
        annotation: { startOffset: 3, endOffset: 3.5, lowFrequency: 5000, highFrequency: 6500 },
      },
    ] as const satisfies AnnotationBoundingBoxTest[];

    createAnnotationTests(tests);
  });

  test.describe("overflowing annotations", () => {
    test.describe("fully overflowing", () => {
      const tests = [
        {
          name: "super set",
          annotation: {
            startOffset: -2,
            endOffset: 7,
            lowFrequency: -1000,
            highFrequency: 23050,
          },
        },
        {
          name: "negative y-axis",
          annotation: {
            startOffset: 3,
            endOffset: 3.4,
            lowFrequency: 24000,
            highFrequency: 28000,
          },
        },
        {
          name: "negative x-axis",
          annotation: {
            startOffset: -2,
            endOffset: -1,
            lowFrequency: 1000,
            highFrequency: 3000,
          },
        },
        {
          name: "positive y-axis",
          annotation: {
            startOffset: 2,
            endOffset: 4,
            lowFrequency: -4000,
            highFrequency: -2000,
          },
        },
        {
          name: "positive x-axis",
          annotation: {
            startOffset: 7,
            endOffset: 8,
            lowFrequency: 1000,
            highFrequency: 3000,
          },
        },
      ] as const satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("partially overflowed 1 axis", () => {
      const tests = [
        {
          name: "start time has overflowed",
          annotation: {
            startOffset: -2,
            endOffset: 0.5,
            lowFrequency: -1000,
            highFrequency: 1000,
          },
        },
        {
          name: "end time has overflowed",
          annotation: {
            startOffset: 4.5,
            endOffset: 7,
            lowFrequency: 5000,
            highFrequency: 6900,
          },
        },
        {
          name: "low frequency has overflowed",
          annotation: {
            startOffset: 3,
            endOffset: 3.4,
            lowFrequency: -2000,
            highFrequency: 1000,
          },
        },
        {
          name: "high frequency has overflowed",
          annotation: {
            startOffset: 2,
            endOffset: 2.5,
            lowFrequency: 10000,
            highFrequency: 13050,
          },
        },
        {
          // In this test, the annotation is not overflowing, but if the label
          // was rendered in the top left position, it would overflow the
          // high frequency axis
          // therefore, we expect that the label will be rendered on the bottom
          name: "high frequency label is overflowing",
          annotation: {
            startOffset: 3,
            endOffset: 3.4,
            lowFrequency: 9500,
            highFrequency: 10900,
          },
        },
      ] as const satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("two axes overflow", () => {
      const tests = [
        {
          name: "time dimensions overflow",
          annotation: {
            startOffset: -2,
            endOffset: 7,
            lowFrequency: 2000,
            highFrequency: 4000,
          },
        },
        {
          name: "frequency dimensions have overflow",
          annotation: {
            startOffset: 3.8,
            endOffset: 4.2,
            lowFrequency: -1000,
            highFrequency: 23050,
          },
        },
      ] as const satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("corners overflowed", () => {
      const tests = [
        {
          name: "top left",
          annotation: {
            startOffset: -0.1,
            endOffset: 0.1,
            lowFrequency: 10500,
            highFrequency: 11500,
          },
        },
        {
          name: "top right",
          annotation: {
            startOffset: 4.9,
            endOffset: 5.1,
            lowFrequency: 10500,
            highFrequency: 12000,
          },
        },
        {
          name: "bottom right",
          annotation: {
            startOffset: 4.9,
            endOffset: 5.1,
            lowFrequency: -500,
            highFrequency: 500,
          },
        },
        {
          name: "bottom left",
          annotation: {
            startOffset: -0.1,
            endOffset: 0.1,
            lowFrequency: -500,
            highFrequency: 500,
          },
        },
      ] as const satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });
  });

  test.describe("updating annotations", () => {
    const inViewTemplate = `
      <oe-annotation
        start-time="0.2"
        end-time="1"
        low-frequency="1000"
        high-frequency="2000"
      ></oe-annotation>
    `;

    const outOfViewTemplate = `
      <oe-annotation
        start-time="-2"
        end-time="-1"
        low-frequency="1000"
        high-frequency="2000"
      ></oe-annotation>
    `;

    test("should remove a bounding box if is updated from inside to outside the view window", async ({ fixture }) => {
      await fixture.createWithTemplate(inViewTemplate);

      const initialAnnotationCount = await fixture.annotationCount();
      expect(initialAnnotationCount).toBeGreaterThan(0);

      const expectedAnnotationCount = initialAnnotationCount - 1;

      await fixture.moveAnnotationOutsideView(0);

      const realizedAnnotationCount = await fixture.annotationCount();
      expect(realizedAnnotationCount).toBe(expectedAnnotationCount);
    });

    test("should add a bounding box if it is updated from outside to inside the view window", async ({ fixture }) => {
      await fixture.createWithTemplate(outOfViewTemplate);

      const initialAnnotationCount = await fixture.annotationCount();
      expect(initialAnnotationCount).toBe(0);

      const expectedAnnotationCount = initialAnnotationCount + 1;

      await fixture.moveAnnotationInsideView(0);

      const realizedAnnotationCount = await fixture.annotationCount();
      expect(realizedAnnotationCount).toBe(expectedAnnotationCount);
    });

    test("should correctly update an annotation from inside to inside the view window", async ({ fixture }) => {
      await fixture.createWithTemplate(inViewTemplate);

      const initialAnnotationCount = await fixture.annotationCount();
      expect(initialAnnotationCount).toBeGreaterThan(0);

      await fixture.moveAnnotationInsideView(0);

      const realizedAnnotationCount = await fixture.annotationCount();
      expect(realizedAnnotationCount).toBe(initialAnnotationCount);
    });

    test("should keep hidden if updated from out of view to another out of view position", async ({ fixture }) => {
      await fixture.createWithTemplate(outOfViewTemplate);

      const initialAnnotationCount = await fixture.annotationCount();
      expect(initialAnnotationCount).toBe(0);

      await fixture.moveAnnotationOutsideView(0);

      const finalAnnotationCount = await fixture.annotationCount();
      expect(finalAnnotationCount).toBe(0);
    });

    test("should correctly remove an annotation", async ({ fixture }) => {
      await fixture.createWithTemplate(inViewTemplate);

      const initialAnnotationCount = await fixture.annotationCount();
      expect(initialAnnotationCount).toBeGreaterThan(0);

      const expectedAnnotationCount = initialAnnotationCount - 1;

      await fixture.removeAnnotation(0);

      const realizedAnnotationCount = await fixture.annotationCount();

      expect(realizedAnnotationCount).toBe(expectedAnnotationCount);
    });
  });

  test.describe("selecting annotations", () => {
    test("should change the annotations color if inside the bounding box is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationBoundingBoxes())[0];
      await target.click();
    });

    test("should change the annotations color if the label is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationLabels())[0];

      const initialAnnotationColor = getBrowserStyles(target)[0].color;

      await target.click();
    });

    test("should raise above other annotations when the bounding box is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationBoundingBoxes())[0];
      await target.click();
    });

    test("should raise above other annotations when the label is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationLabels())[0];
      await target.click();
    });
  });
});

// TODO: importing the AnnotationTagStyle enum from the annotate.ts file causes
// a bundler error with the very confusing error message
// "SyntaxError: src/components/annotate/css/style.css: Unexpected token (1:0)playwright"
// see: https://github.com/ecoacoustics/web-components/issues/289
test.describe("annotation style tag", () => {
  test.describe("initial styles", () => {
    test("should use the correct default tag style", async ({ fixture }) => {
      await fixture.create();

      const realizedTagStyle = await getBrowserValue<AnnotateComponent>(fixture.component(), "tagStyle");

      // I would like to use the TagStyle enum here, but it causes a bundler
      // error, so I'm using an untyped string value instead
      expect(realizedTagStyle).toBe("edge");
    });

    test("should have the correct 'hidden' attribute behavior", async ({ fixture }) => {
      await fixture.createWithTagStyle("hidden");
    });

    test("should have the correct 'edge' behavior", async ({ fixture }) => {
      await fixture.createWithTagStyle("edge");
    });

    test("should have the correct 'spectrogram-top' behavior", async ({ fixture }) => {
      await fixture.createWithTagStyle("spectrogram-top");
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
