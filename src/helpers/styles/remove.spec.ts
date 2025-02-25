import { stylesFixture as test } from "./styles.fixture";
import { css } from "lit";
import { expect } from "../../tests/assertions";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test("should correctly remove a single stylesheet", () => {});

test("should correctly remove an array of stylesheets", () => {});

test("should correctly remove a nested tree of stylesheets", () => {});

test("should only remove stylesheets that are present in a stylesheet array", () => {});

test("should have no operation if no stylesheets are present", async ({ fixture }) => {
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
  expect(styles).toBeUndefined();
});

test("should have no operation if an empty array is passed", () => {});

test("should have no operation if a non-existent stylesheet is passed", () => {});
