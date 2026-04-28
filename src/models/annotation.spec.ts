import { expect, test } from "../tests/assertions";
import { Annotation } from "./annotation";

test.describe("valid", () => {
  test.describe("valid annotations", () => {
    test("should correctly identify a valid annotation", () => {
      const model = new Annotation(0, 2, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept a annotation is very small but valid width", () => {
      const model = new Annotation(0, 0.0001, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept a annotation is very small but valid height", () => {
      const model = new Annotation(0, 2, 0, 0.0001, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with undefined lowFrequency", () => {
      const model = new Annotation(0, 2, undefined, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with undefined highFrequency", () => {
      const model = new Annotation(0, 2, 0, undefined, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with both frequencies undefined", () => {
      const model = new Annotation(0, 2, undefined, undefined, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with undefined endOffset", () => {
      const model = new Annotation(0, undefined, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with all optional fields undefined", () => {
      const model = new Annotation(0, undefined, undefined, undefined, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with null lowFrequency", () => {
      const model = new Annotation(0, 2, null, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with null highFrequency", () => {
      const model = new Annotation(0, 2, 0, null, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with both frequencies null", () => {
      const model = new Annotation(0, 2, null, null, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with null endOffset", () => {
      const model = new Annotation(0, null, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(true);
    });

    test("should accept an annotation with all optional fields null", () => {
      const model = new Annotation(0, null, null, null, [], {}, []);
      expect(model.valid()).toBe(true);
    });
  });

  test.describe("invalid annotations", () => {
    test("should correctly reject a 0 width annotation", () => {
      const model = new Annotation(0, 0, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(false);
    });

    test("should correctly reject a 0 frequency annotation", () => {
      const model = new Annotation(0, 2, 0, 0, [], {}, []);
      expect(model.valid()).toBe(false);
    });

    test("should correctly reject a 0 width and frequency annotation", () => {
      const model = new Annotation(0, 0, 0, 0, [], {}, []);
      expect(model.valid()).toBe(false);
    });

    test("should correctly reject inverted frequencies", () => {
      const model = new Annotation(0, 2, 3_000, 0, [], {}, []);
      expect(model.valid()).toBe(false);
    });

    test("should correctly reject inverted offsets", () => {
      const model = new Annotation(2, 0, 0, 3_000, [], {}, []);
      expect(model.valid()).toBe(false);
    });

    test("should correctly reject inverted frequencies and offsets", () => {
      const model = new Annotation(2, 0, 3_000, 0, [], {}, []);
      expect(model.valid()).toBe(false);
    });
  });
});
