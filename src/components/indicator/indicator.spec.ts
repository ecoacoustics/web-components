import { expect } from "../../tests/assertions";
import { indicatorFixture as test } from "./indicator.fixture";

test.describe("Indicator component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should be the exact size as its largest direct descendant", async ({ fixture }) => {
    const expectedSize = { width: 200, height: 200 };
    const realizedSize = await fixture.indicatorSize();
    expect(realizedSize).toEqual(expectedSize);
  });
});
