import { stylesFixture as test } from "./styles.fixture";
import { css } from "lit";
import { expect } from "../../tests/assertions";
import { removeStyleSheets } from "./remove";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test.skip("should correctly remove a single stylesheet", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();

  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];
  const testedStyle = initialStyles[0];

  removeStyleSheets(fakeComponent, testedStyle);
  const finalStyles = (await fixture.getComponentStyleSheets()) ?? [];

  expect(finalStyles).not.toContain(testedStyle);
  expect(finalStyles).toHaveLength(initialStyles.length - 1);
});

test.skip("should correctly remove an array of stylesheets", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  // test removing all of the style sheets except from the last one
  const testedStyles = initialStyles.slice(0, -1);
  removeStyleSheets(fakeComponent, testedStyles);

  const finalStyles = (await fixture.getComponentStyleSheets()) ?? [];

  expect(finalStyles).toEqual([initialStyles.at(-1)]);
});

test.skip("should only remove stylesheets that are present in a stylesheet array", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();
  const initialStyles = (await fixture.getComponentStyleSheets()) ?? [];

  // test removing all of the style sheets except from the last one
  const testedStyles = initialStyles.slice(0, -1);
  removeStyleSheets(fakeComponent, [
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

test.skip("should have no operation if no stylesheets are present", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();
  const initialStyles = await fixture.getComponentStyleSheets();

  removeStyleSheets(fakeComponent, [
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

test.skip("should have no operation if a non-existent stylesheet is passed", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();

  const initialStyles = await fixture.getComponentStyleSheets();

  // notice that while a lot of the other tests pass in an array of styles, this
  // test passes in a single style
  removeStyleSheets(
    fakeComponent,
    css`
      h1 {
        color: red;
      }
    `,
  );

  const styles = await fixture.getComponentStyleSheets();
  expect(styles).toEqual(initialStyles);
});

test.skip("should have no operation if an empty array is passed", async ({ fixture }) => {
  const fakeComponent = fixture.generateFakeElement();
  const initialStyles = await fixture.getComponentStyleSheets();

  removeStyleSheets(fakeComponent, []);

  const styles = await fixture.getComponentStyleSheets();
  expect(styles).toEqual(initialStyles);
});
