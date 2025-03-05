import { css } from "lit";
import { stylesFixture as test } from "./styles.fixture";
import { expect } from "../../tests/assertions";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test("should correctly add a single stylesheet", async ({ fixture }) => {
  const testedStyles = css`
    :host {
      color: red;
    }
  `;

  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  await fixture.addStyleSheets([testedStyles]);
  const finalStyles = await fixture.getComponentStyleSheets();

  expect(finalStyles).toContain(testedStyles.styleSheet);
  expect(finalStyles).toHaveLength(initialStyles.length + 1);
});

// In this test I test passing in an array of stylesheets that has a nested
// array inside it.
// This is possible because each CSSResultArray item can be a CSSResultArray
test("should correctly add an array of stylesheets", async ({ fixture }) => {
  // I prettier ignore so that I can put each style sheet on a new line
  // this is much more readable than the prettier formatting where each style
  // sheet is five lines long
  // prettier-ignore
  const testedStyles = [
    css`:host { color: red; }`,
    [
      css`:host { background-color: blue; }`,
      [
        css`canvas { display: block; }`,
      ],
      css`:host { font-size: 16px; }`,
    ],
  ];

  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  await fixture.addStyleSheets(testedStyles);
  const finalStyles = await fixture.getComponentStyleSheets();

  expect(finalStyles).toHaveLength(initialStyles.length + 4);
});

test("should have no operation if an empty array is passed", async ({ fixture }) => {
  const initialStyles = await fixture.getComponentStyleSheets();

  await fixture.addStyleSheets([]);
  const finalStyles = await fixture.getComponentStyleSheets();

  expect(finalStyles).toEqual(initialStyles);
});
