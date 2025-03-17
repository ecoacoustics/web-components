import { expect } from "../../tests/assertions";
import { mergeStyles } from "./merge";
import { stylesFixture as test } from "./styles.fixture";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test("should not have any operation if an empty array is passed", async ({ fixture }) => {
  const initialStyles = await fixture.getComponentStyleSheets();
  const resultStyles = mergeStyles([], initialStyles);
  expect(initialStyles).toEqual(resultStyles);
});

test("should correctly merge an array of stylesheets", async ({ fixture }) => {
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];
  const resultStyles = mergeStyles([":host { color: red; }", "canvas { background-color: white; }"], initialStyles);
  expect(resultStyles).toHaveLength(initialStyles.length + 2);
});
