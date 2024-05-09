import { axesFixture as test } from "./axes.fixture";

test.describe("axes", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });
});
