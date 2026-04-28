import { expect } from "../../tests/assertions";
import { getElementSize } from "../../tests/helpers/helpers";
import { AxesComponent } from "./axes";
import { axesFixture as test } from "./axes.fixture";

test.describe.skip("axes", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.skip("should be the exact size as its largest direct descendant", async ({ fixture }) => {
    const expectedSize = { width: 200, height: 200 };
    const realizedSize = await getElementSize<AxesComponent>(fixture.component());
    expect(realizedSize).toEqual(expectedSize);
  });
});
