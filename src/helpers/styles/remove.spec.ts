import { stylesFixture as test } from "./styles.fixture";
import { css } from "lit";
import { expect } from "../../tests/assertions";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test("should correctly remove a single stylesheet", async ({ fixture }) => {
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];
  const testedStyle = initialStyles[0];

  await fixture.removeStyleSheets(testedStyle);
  const finalStyles = (await fixture.getComponentStyleSheets()) ?? [];

  expect(finalStyles).not.toContain(testedStyle);
  expect(finalStyles).toHaveLength(initialStyles.length - 1);
});

test("should correctly remove an array of stylesheets", async ({ fixture }) => {
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  // test removing all of the style sheets except from the last one
  const testedStyles = initialStyles.slice(0, -1);
  await fixture.removeStyleSheets(testedStyles);

  const finalStyles = (await fixture.getComponentStyleSheets()) ?? [];

  expect(finalStyles).toEqual([initialStyles.at(-1)]);
});

test("should only remove stylesheets that are present in a stylesheet array", async ({ fixture }) => {
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  // test removing all of the style sheets except from the last one
  const testedStyles = initialStyles.slice(0, -1);
  await fixture.removeStyleSheets([
    ...testedStyles,
    css`
      h1 {
        color: red;
      }
    `,
  ]);

  const finalStyles = (await fixture.getComponentStyleSheets()) ?? [];

  expect(finalStyles).toEqual([initialStyles.at(-1)]);
});

test("should have no operation if no stylesheets are present", async ({ fixture }) => {
  const initialStyles = await fixture.getComponentStyleSheets();

  await fixture.removeStyleSheets([
    css`
      h1 {
        color: red;
      }
    `,
    css`
      #my-heading {
        color: blue;
        font-size: 2em;
      }
      .my-class {
        color: green;
      }
    `,
  ]);

  const styles = await fixture.getComponentStyleSheets();
  expect(styles).toEqual(initialStyles);
});

test("should have no operation if a non-existent stylesheet is passed", async ({ fixture }) => {
  const initialStyles = await fixture.getComponentStyleSheets();

  // notice that while a lot of the other tests pass in an array of styles, this
  // test passes in a single style
  await fixture.removeStyleSheets(css`
    h1 {
      color: red;
    }
  `);

  const styles = await fixture.getComponentStyleSheets();
  expect(styles).toEqual(initialStyles);
});

test("should have no operation if an empty array is passed", async ({ fixture }) => {
  const initialStyles = await fixture.getComponentStyleSheets();

  await fixture.removeStyleSheets([]);

  const styles = await fixture.getComponentStyleSheets();
  expect(styles).toEqual(initialStyles);
});
