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
