import { Annotation } from "../../models/annotation";
import { expect } from "../../tests/assertions";
import {
  catchLocatorEvent,
  getBrowserStyle,
  getBrowserValue,
  getCssBackgroundColorVariable,
  removeBrowserAttribute,
  setBrowserAttribute,
} from "../../tests/helpers";
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

    test("should have the correct attribute tag label", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(0);
      await expect(labelTarget).toHaveTrimmedText("bird");
    });

    test("should have the correct text for multiple tag labels", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(1);
      await expect(labelTarget).toHaveTrimmedText("cow,male");
    });

    test("should correctly render slotted content", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(2);
      await expect(labelTarget).toHaveTrimmedText("Bat Slotted,Ultrasonic Slotted");
    });

    test("should correctly render mixed attribute and slotted content", async ({ fixture }) => {
      const labelTarget = await fixture.annotationLabel(3);
      await expect(labelTarget).toHaveTrimmedText("bat-attribute,Ultrasonic Slotted");
    });
  });

  test.describe("in-view annotations", () => {
    const tests = [
      {
        name: "should correctly place correct bounding boxes",
        annotation: { startOffset: 3, endOffset: 3.5, lowFrequency: 5000, highFrequency: 6500 },
      },
    ] as const satisfies AnnotationBoundingBoxTest[];

    createAnnotationTests(tests);
  });

  test.describe("annotation overflow", () => {
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

        // only one axes is visible
        {
          name: "only low frequency",
          annotation: {
            startOffset: -1,
            endOffset: 6,
            lowFrequency: -1000,
            highFrequency: 1000,
          },
        },
        {
          name: "only high frequency",
          annotation: {
            startOffset: -1,
            endOffset: 6,
            lowFrequency: 9000,
            highFrequency: 12000,
          },
        },
        {
          name: "only start time",
          annotation: {
            startOffset: -1,
            endOffset: 0.3,
            lowFrequency: -1000,
            highFrequency: 12000,
          },
        },
        {
          name: "only end time",
          annotation: {
            startOffset: 4.4,
            endOffset: 5.2,
            lowFrequency: -1000,
            highFrequency: 12000,
          },
        },
      ] as const satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("partial axis overflow", () => {
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
          name: "high frequency overflow",
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
          name: "frequency label overflow",
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

    test.describe("corner overflow", () => {
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
    const inViewAnnotation = {
      startOffset: 0.2,
      endOffset: 1,
      lowFrequency: 1000,
      highFrequency: 2000,
    } as const satisfies PartialAnnotation;

    const outOfViewAnnotation = {
      startOffset: -2,
      endOffset: -1,
      lowFrequency: 1000,
      highFrequency: 2000,
    } as const satisfies PartialAnnotation;

    test("should remove a bounding box if is updated from inside to outside the view window", async ({ fixture }) => {
      await fixture.createWithAnnotation(inViewAnnotation);

      const annotationBoxes = await fixture.annotationBoundingBoxes();
      const initialAnnotationCount = annotationBoxes.length;
      expect(initialAnnotationCount).toBeGreaterThan(0);

      const expectedAnnotationCount = initialAnnotationCount - 1;

      const targetAnnotation = (await fixture.annotations())[0];
      const updatedEvent = catchLocatorEvent(targetAnnotation, "oe-annotation-updated");

      await fixture.moveAnnotationOutsideView();
      await expect(updatedEvent).resolves.toBeDefined();

      const realizedAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(realizedAnnotationCount).toBe(expectedAnnotationCount);
    });

    test("should add a bounding box if it is updated from outside to inside the view window", async ({ fixture }) => {
      await fixture.createWithAnnotation(outOfViewAnnotation);

      const initialAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(initialAnnotationCount).toBe(0);

      const expectedAnnotationCount = initialAnnotationCount + 1;

      const targetAnnotation = (await fixture.annotations())[0];
      const updatedEvent = catchLocatorEvent(targetAnnotation, "oe-annotation-updated");

      await fixture.moveAnnotationInsideView();
      await expect(updatedEvent).resolves.toBeDefined();

      const finalAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(finalAnnotationCount).toBe(expectedAnnotationCount);
    });

    test("should correctly update an annotation from inside to inside the view window", async ({ fixture }) => {
      await fixture.createWithAnnotation(inViewAnnotation);

      const initialAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(initialAnnotationCount).toBeGreaterThan(0);

      const targetAnnotation = (await fixture.annotations())[0];
      const updatedEvent = catchLocatorEvent(targetAnnotation, "oe-annotation-updated");

      await fixture.moveAnnotationInsideView();
      await expect(updatedEvent).resolves.toBeDefined();

      const realizedAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(realizedAnnotationCount).toBe(initialAnnotationCount);
    });

    test("should keep hidden if updated from out of view to another out of view position", async ({ fixture }) => {
      await fixture.createWithAnnotation(outOfViewAnnotation);

      const initialAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(initialAnnotationCount).toBe(0);

      await fixture.moveAnnotationOutsideView();

      const finalAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(finalAnnotationCount).toBe(0);
    });

    test("should correctly remove an annotation", async ({ fixture }) => {
      await fixture.createWithAnnotation(inViewAnnotation);

      const initialAnnotationCount = (await fixture.annotationBoundingBoxes()).length;
      expect(initialAnnotationCount).toBeGreaterThan(0);

      const expectedAnnotationCount = initialAnnotationCount - 1;

      await fixture.removeAnnotation();

      const realizedAnnotationCount = (await fixture.annotationBoundingBoxes()).length;

      expect(realizedAnnotationCount).toBe(expectedAnnotationCount);
    });
  });

  test.describe("selecting annotations", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should change the annotations color if inside the bounding box is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationBoundingBoxes())[0];

      const expectedAnnotationColor = await getCssBackgroundColorVariable(target, "--oe-annotation-color");
      const expectedFocusedAnnotationColor = await getCssBackgroundColorVariable(
        target,
        "--oe-annotation-selected-color",
      );

      const initialAnnotationColor = await getBrowserStyle(target, "border-color");
      expect(initialAnnotationColor).toEqual(expectedAnnotationColor);

      await target.click();

      const finalAnnotationColor = await getBrowserStyle(target, "border-color");
      expect(finalAnnotationColor).toEqual(expectedFocusedAnnotationColor);

      expect(finalAnnotationColor).not.toBe(initialAnnotationColor);
    });

    test("should change the annotations color if the label is clicked", async ({ fixture }) => {
      const target = (await fixture.annotationLabels())[0];

      const expectedAnnotationColor = await getCssBackgroundColorVariable(target, "--oe-annotation-color");
      const expectedFocusedAnnotationColor = await getCssBackgroundColorVariable(
        target,
        "--oe-annotation-selected-color",
      );

      const initialAnnotationColor = await getBrowserStyle(target, "background-color");
      expect(initialAnnotationColor).toEqual(expectedAnnotationColor);

      await target.click();

      const finalAnnotationColor = await getBrowserStyle(target, "background-color");
      expect(finalAnnotationColor).toEqual(expectedFocusedAnnotationColor);

      expect(finalAnnotationColor).not.toBe(initialAnnotationColor);
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
      expect(realizedTagStyle).toEqual("edge");
    });

    test("should have the correct 'edge' behavior", async ({ fixture }) => {
      await fixture.create("edge");

      const allLabels = await fixture.annotationLabels();
      const edgeLabels = await fixture.annotationEdgeLabels();
      const chromeTopLabels = await fixture.annotationTopLabels();

      expect(allLabels).toHaveLength(4);
      expect(edgeLabels).toHaveLength(allLabels.length);
      expect(chromeTopLabels).toHaveLength(0);
    });

    test("should have the correct 'spectrogram-top' behavior", async ({ fixture }) => {
      await fixture.create("spectrogram-top");

      const allLabels = await fixture.annotationLabels();
      const chromeTopLabels = await fixture.annotationTopLabels();
      const edgeLabels = await fixture.annotationEdgeLabels();

      expect(allLabels).toHaveLength(4);
      expect(chromeTopLabels).toHaveLength(allLabels.length);
      expect(edgeLabels).toHaveLength(0);
    });

    test("should have the correct 'hidden' attribute behavior", async ({ fixture }) => {
      await fixture.create("hidden");
      const tagLabels = await fixture.annotationLabels();
      expect(tagLabels).toHaveLength(0);
    });
  });

  test.describe("updating attributes", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should correctly update if the tag style is updated to 'hidden'", async ({ fixture }) => {
      // we expect that the annotation labels are visible, and then when we set
      // the tag style to 'hidden', the labels will be hidden
      const initialLabels = await fixture.annotationLabels();
      expect(initialLabels).toHaveLength(4);

      await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "hidden");

      const annotationLabels = await fixture.annotationLabels();
      expect(annotationLabels).toHaveLength(0);

      // we should see that the annotation containers are still present
      // although the labels are not
      const annotationContainers = await fixture.annotationContainers();
      expect(annotationContainers).toHaveLength(4);
    });

    test("should correctly update if the tag style is updated to 'edge'", async ({ fixture }) => {
      await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "edge");

      const annotationLabels = await fixture.annotationLabels();
      expect(annotationLabels).toHaveLength(4);
    });

    test("should correctly update if the tag style is updated to 'spectrogram-top'", async ({ fixture }) => {
      await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "spectrogram-top");

      const annotationLabels = await fixture.annotationLabels();
      expect(annotationLabels).toHaveLength(4);
    });

    test("should remove chrome-top when changing from spectrogram-top to default", async ({ fixture }) => {
      await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "spectrogram-top");

      const chromeShape = await fixture.chromeTop().boundingBox();
      expect(chromeShape?.height).toBeGreaterThan(0);

      // I purposely remove the tag-style attribute here instead of setting it
      // to another value because I think removing an attribute is more likely
      // to break
      await removeBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any);

      const chromeShapeAfter = await fixture.chromeTop().boundingBox();
      expect(chromeShapeAfter?.height).toEqual(0);
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
