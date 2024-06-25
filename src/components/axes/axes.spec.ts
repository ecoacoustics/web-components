import { expect } from "../../tests/assertions";
import { axesFixture as test } from "./axes.fixture";

test.describe("axes", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.fixme("should be the exact size as its largest direct descendant", async ({ fixture }) => {
    const expectedSize = { width: 200, height: 200 };
    const realizedSize = await fixture.indicatorSize();
    expect(realizedSize).toEqual(expectedSize);
  });
});
