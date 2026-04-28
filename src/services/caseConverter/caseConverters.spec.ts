import { expect, test } from "../../tests/assertions";
import { identityCase, uppercaseDotCase } from "./caseConverters";

test.describe("identifyCase", () => {
  test("should not modify empty", () => {
    expect(identityCase("")).toBe("");
  });

  test("should not modify casing", () => {
    expect(identityCase("testWord")).toBe("testWord");
  });
});

test.describe("uppercaseDotCase", () => {
  test("should convert empty string to empty string", () => {
    expect(uppercaseDotCase("")).toBe("");
  });

  test("should convert single word to uppercase", () => {
    expect(uppercaseDotCase("test")).toBe("Test");
  });

  test("should convert camelCase to Uppercase.Dot.Casing", () => {
    expect(uppercaseDotCase("testWord")).toBe("Test.Word");
  });

  test("should convert dot.case to Uppercase.Dot.Casing", () => {
    expect(uppercaseDotCase("test.word")).toBe("Test.Word");
  });

  test("should convert PascalCase to Uppercase.Dot.Casing", () => {
    expect(uppercaseDotCase("TestWord")).toBe("Test.Word");
  });

  test("should not change existing Uppercase.Dot.Casing", () => {
    expect(uppercaseDotCase("Test.Word")).toBe("Test.Word");
  });
});
