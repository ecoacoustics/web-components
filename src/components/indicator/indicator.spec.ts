import { expect } from "../../tests/assertions";
import { getElementSize } from "../../tests/helpers/helpers";
import { IndicatorComponent } from "./indicator";
import { indicatorFixture as test } from "./indicator.fixture";

test.describe("Indicator component", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test.skip("should be the exact size as its largest direct descendant", async ({ fixture }) => {
    const expectedSize = { width: 200, height: 200 };
    const realizedSize = await getElementSize<IndicatorComponent>(fixture.component());
    expect(realizedSize).toEqual(expectedSize);
  });

  // We used to render the indicator component before the unit converter
  // initialization, but this caused problems when interacting with component
  // such as the axes component that only render once the unit converter is
  // available.
  // By not rendering anything until the unit converter is available, we avoid
  // visual layout shifts once the unit converter is initialized.
  test("should not render if there is no unit converter", async ({ fixture }) => {
    // By default, this fixture does not create with a unit converter, meaning
    // that we can just assert that the indicator line is not rendered.
    await expect(fixture.indicatorLineElement()).toHaveCount(0);
  });
});
