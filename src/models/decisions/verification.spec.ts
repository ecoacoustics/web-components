import { expect, test } from "../../tests/assertions";
import { DecisionOptions } from "./decision";
import { Verification } from "./verification";

test.describe("addTag", () => {
  test("should return a new instance of the verification model with the tag property changed", () => {
    const tag = { text: "foo" };
    const verification = new Verification(DecisionOptions.TRUE);
    const newVerification = verification.addTag(tag);

    // by using the "toBe" assertion here, it will compare the references of the
    // two objects and ensure that they are different instances
    // we also use "toEqual" in the tag assertion to ensure that the tag
    // property was correctly updated
    expect(newVerification).not.toBe(verification);
    expect(newVerification.tag).toEqual(tag);
  });
});
