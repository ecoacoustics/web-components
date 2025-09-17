import { expect } from "../../tests/assertions";
import { getElementSize } from "../../tests/helpers/helpers";
import { IndicatorComponent } from "./indicator";
import { indicatorFixture as test } from "./indicator.fixture";

test.describe.skip("Indicator component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should be the exact size as its largest direct descendant", async ({ fixture }) => {
    const expectedSize = { width: 200, height: 200 };
    const realizedSize = await getElementSize<IndicatorComponent>(fixture.component());
    expect(realizedSize).toEqual(expectedSize);
  });
});
