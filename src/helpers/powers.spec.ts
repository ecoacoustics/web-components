import { expect, test } from "../tests/assertions";
import { isPowerOfTwo } from "../helpers/powers";
import { ValidNumber } from "./types/advancedTypes";

// We don't have to handle any Infinity, NaN, etc... edge cases because
// TypeScript enforces that this function will only be called a "ValidNumber".

test("should return true for a power of 2", () => {
  expect(isPowerOfTwo(2048 as ValidNumber)).toEqual(true);
});

test("should return false for a non-power of 2", () => {
  expect(isPowerOfTwo(2047 as ValidNumber)).toEqual(false);
});

// 1 * 1 == 1 makes it a power of 2 but also an edge case
test("should return true for 1", () => {
  expect(isPowerOfTwo(1 as ValidNumber)).toEqual(true);
});

test("should return false if the value is zero", () => {
  expect(isPowerOfTwo(0 as ValidNumber)).toEqual(false);
});

test("should return false if the value is less than zero", () => {
  expect(isPowerOfTwo(-2048 as ValidNumber)).toEqual(false);
});
