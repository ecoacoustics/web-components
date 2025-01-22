import { expect, test } from "../tests/assertions";
import { Annotation } from "./annotation";

test.describe("valid", () => {
  test("should correctly identify a valid annotation", () => {
    const model = new Annotation(0, 2, 0, 3_000, [], {}, []);
    expect(model.valid()).toBe(true);
  });

  test("should correctly identify inverted frequencies", () => {
    const model = new Annotation(0, 2, 3_000, 0, [], {}, []);
    expect(model.valid()).toBe(false);
  });

  test("should correctly identify inverted offsets", () => {
    const model = new Annotation(2, 0, 0, 3_000, [], {}, []);
    expect(model.valid()).toBe(false);
  });

  test("should correctly identify inverted frequencies and offsets", () => {
    const model = new Annotation(2, 0, 3_000, 0, [], {}, []);
    expect(model.valid()).toBe(false);
  });
});
