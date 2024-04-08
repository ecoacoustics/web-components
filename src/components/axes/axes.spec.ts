import { test } from "@sand4rt/experimental-ct-web";
import { axesFixture } from "./axes.fixture";

test.describe("unit test", () => {});

axesFixture.describe("axes", () => {
  axesFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });
});
