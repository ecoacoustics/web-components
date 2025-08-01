import { expect, test } from "../tests/assertions";
import { callbackConverter } from "./attributes";

test.describe("callbackConverter", () => {
  test("should parse a callback that doesn't return a value", () => {
    const callback = callbackConverter("() => {}");

    // All JavaScript functions implicitly return "undefined" if there is no
    // return statement.
    expect(callback()).toBeUndefined();
  });

  test("should be able to return a value from the callback", () => {
    const callback = callbackConverter("() => 1");
    expect(callback()).toEqual(1);
  });

  test("should be able to conditionally branch and throw", () => {
    // We are also testing in this test case that multiline strings can be
    // correctly parsed, and that the provided function can take parameters.
    const callback = callbackConverter(`(x) => {
      if (x < 10) {
        return false;
      }

      return true;
    }`);

    expect(callback(9)).toEqual(false);
    expect(callback(10)).toEqual(true);
  });
});
