import { expect, test } from "../../tests/assertions";
import { Tag } from "../tag";
import { DecisionOptions } from "./decision";
import { Verification } from "./verification";

test.describe("withTag", () => {
  test("should return a new instance of the verification model with the tag property changed", () => {
    const tag: Tag = { text: "foo" };
    const verification = new Verification(DecisionOptions.TRUE);
    const newVerification = verification.withTag(tag);

    // by using the "toBe" assertion here, it will compare the references of the
    // two objects and ensure that they are different instances
    // we also use "toEqual" in the tag assertion to ensure that the tag
    // property was correctly updated
    expect(newVerification).not.toBe(verification);
    expect(newVerification.tag).toEqual(tag);
  });
});
