import { Hertz, Seconds } from "../../models/unitConverters";
import { expect } from "../../tests/assertions";
import { setBrowserValue } from "../../tests/helpers";
import { TagComponent } from "../tag/tag";
import { annotateFixture as test } from "./annotate.fixture";

export interface PartialAnnotation {
  startTime: Seconds;
  endTime: Seconds;
  lowFrequency: Hertz;
  highFrequency: Hertz;
}

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

test.describe("with annotation", () => {
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
        annotation: { startTime: 3, endTime: 3.5, lowFrequency: 5000, highFrequency: 6500 },
      },
    ] satisfies AnnotationBoundingBoxTest[];

    createAnnotationTests(tests);
  });

  test.describe("overflowing annotations", () => {
    test.describe("fully overflowing", () => {
      const tests = [
        {
          name: "should correctly remove the bounding box if it is a super set of the view window",
          annotation: {
            startTime: -2,
            endTime: 7,
            lowFrequency: -1000,
            highFrequency: 23050,
          },
        },
        {
          name: "should correctly remove the bounding box if it has fully overflowed the negative y-axis",
          annotation: {
            startTime: 3,
            endTime: 3.4,
            lowFrequency: 24000,
            highFrequency: 28000,
          },
        },
        {
          name: "should correctly remove the bounding box if it has fully overflowed the negative x-axis",
          annotation: {
            startTime: -2,
            endTime: -1,
            lowFrequency: 1000,
            highFrequency: 3000,
          },
        },
        {
          name: "should correctly remove the bounding box if it has fully overflowed the positive y-axis",
          annotation: {
            startTime: 2,
            endTime: 4,
            lowFrequency: -4000,
            highFrequency: -2000,
          },
        },
        {
          name: "should correctly remove the bounding box if it has fully overflowed the positive x-axis",
          annotation: {
            startTime: 7,
            endTime: 8,
            lowFrequency: 1000,
            highFrequency: 3000,
          },
        },
      ] satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("partially overflowed 1 axis", () => {
      const tests = [
        {
          name: "should position correctly if only the start time has overflowed",
          annotation: {
            startTime: -2,
            endTime: 0.5,
            lowFrequency: -1000,
            highFrequency: 1000,
          },
        },
        {
          name: "should position correctly if only the end time has overflowed",
          annotation: {
            startTime: 4.5,
            endTime: 7,
            lowFrequency: 5000,
            highFrequency: 6900,
          },
        },
        {
          name: "should position correctly if only the low frequency has overflowed",
          annotation: {
            startTime: 3,
            endTime: 3.4,
            lowFrequency: -2000,
            highFrequency: 1000,
          },
        },
        {
          name: "should position correctly if only the high frequency has overflowed",
          annotation: {
            startTime: 1,
            endTime: 2,
            lowFrequency: 21050,
            highFrequency: 23050,
          },
        },
        {
          name: "should position correctly if only the high frequency label is overflowing",
          annotation: {
            startTime: 3,
            endTime: 3.4,
            lowFrequency: 9500,
            highFrequency: 13000,
          },
        },
      ] satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("two axes overflow", () => {
      const tests = [
        {
          name: "should position correctly if both time dimensions have overflowed",
          annotation: {
            startTime: -2,
            endTime: 7,
            lowFrequency: 2000,
            highFrequency: 4000,
          },
        },
        {
          name: "should position correctly if both frequency dimensions have overflowed",
          annotation: {
            startTime: 3.8,
            endTime: 4.2,
            lowFrequency: -1000,
            highFrequency: 23050,
          },
        },
      ] satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });

    test.describe("corners overflowed", () => {
      const tests = [
        {
          name: "should position correctly in the top left corner",
          annotation: {
            startTime: -0.1,
            endTime: 0.1,
            lowFrequency: 10500,
            highFrequency: 11500,
          },
        },
        {
          name: "should position correctly in the top right corner",
          annotation: {
            startTime: 4.9,
            endTime: 5.1,
            lowFrequency: 10500,
            highFrequency: 12000,
          },
        },
        {
          name: "should position correctly in the bottom right corner",
          annotation: {
            startTime: 4.9,
            endTime: 5.1,
            lowFrequency: -500,
            highFrequency: 500,
          },
        },
        {
          name: "should position correctly in the bottom left corner",
          annotation: {
            startTime: -0.1,
            endTime: 0.1,
            lowFrequency: -500,
            highFrequency: 500,
          },
        },
      ] satisfies AnnotationBoundingBoxTest[];

      createAnnotationTests(tests);
    });
  });

  test.describe("updating annotations", () => {
    test("should correctly remove a bounding box if is updated from inside to outside the view window", () => {});

    test("should correctly add a bounding box if it is updated from outside to inside the view window", () => {});

    test("should keep a bounding box hidden if updated from out of view to another out of view position", () => {});

    test("should correctly update an annotation", () => {});

    test("should correctly remove an annotation", () => {});
  });

  test.describe("selecting annotations", () => {
    test("should change the annotations color if inside the bounding box is clicked", () => {});

    test("should change the annotations color if the label is clicked", () => {});

    test("should raise above other annotations when the bounding box is clicked", () => {});

    test("should raise above other annotations when the label is clicked", () => {});
  });
});

// TODO: For some reason, importing the AnnotationTagStyle enum from the
// annotate.ts file causes a bundler error with the very confusing error message
// "SyntaxError: src/components/annotate/css/style.css: Unexpected token (1:0)playwright"
//
// test.describe("annotation style tag", () => {
//   test.describe("initial styles", () => {
//     test("should use the correct default tag style", async ({ fixture }) => {
//       await fixture.create();

//       const expectedTagStyle = AnnotationTagStyle.EDGE;
//       const realizedTagStyle = await getBrowserValue<AnnotateComponent>(fixture.component(), "tagStyle");

//       expect(realizedTagStyle).toBe(expectedTagStyle);
//     });

//     test("should have the correct 'hidden' attribute behavior", async ({ fixture }) => {
//       await fixture.createWithTagStyle(AnnotationTagStyle.HIDDEN);
//     });

//     test("should have the correct 'edge' behavior", async ({ fixture }) => {
//       await fixture.createWithTagStyle(AnnotationTagStyle.EDGE);
//     });

//     test("should have the correct 'spectrogram-top' behavior", async ({ fixture }) => {
//       await fixture.createWithTagStyle(AnnotationTagStyle.SPECTROGRAM_TOP);
//     });
//   });

//   test.describe("updating attributes", () => {
//     test("should correctly update if the tag style is updated to 'hidden'", async ({ fixture }) => {
//       await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "hidden");
//     });

//     test("should correctly update if the tag style is updated to 'edge'", async ({ fixture }) => {
//       await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "edge");
//     });

//     test("should correctly update if the tag style is updated to 'spectrogram-top'", async ({ fixture }) => {
//       await setBrowserAttribute<AnnotateComponent>(fixture.component(), "tag-style" as any, "spectrogram-top");
//     });
//   });

//   test.describe("slotted tag content", () => {
//     test("should reflect slotted tag content correctly in hidden style", () => {});

//     test("should reflect slotted tag content correctly in edge style", () => {});

//     test("should reflect slotted tag content correctly in 'spectrogram-top' style", () => {});
//   });
// });

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
