import { expect, test } from "../tests/assertions";
import { isValidNumber } from "./numbers";

test.describe("true cases", () => {
  test("should return true for a valid number", () => {
    expect(isValidNumber(42)).toBe(true);
  });

  test("should return true for a negative number", () => {
    expect(isValidNumber(-42_000)).toBe(true);
  });

  test("should return true for a zero number", () => {
    expect(isValidNumber(0)).toEqual(true);
  });

  test("should return true for negative zero", () => {
    expect(isValidNumber(-0)).toEqual(true);
  });
});

test.describe("false cases", () => {
  test("should return false for a NaN", () => {
    expect(isValidNumber(NaN)).toEqual(false);
  });

  test("should return false for Infinity", () => {
    expect(isValidNumber(Infinity)).toEqual(false);
  });

  test("should return false for -Infinity", () => {
    expect(isValidNumber(-Infinity)).toEqual(false);
  });
});
