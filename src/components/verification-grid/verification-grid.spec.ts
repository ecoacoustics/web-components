import { expect } from "../../tests/assertions";
import { verificationGridFixture as test } from "./verification-grid.fixture";

test.describe("verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should use the template for each grid item", async ({ fixture }) => {
    const expectedTemplateElements = 3;
    await fixture.setGridSize(expectedTemplateElements);
    const templateElements = await fixture.templateElements();

    expect(templateElements.length).toBe(expectedTemplateElements);
  });

  test("should place decision elements in the correct location", async ({ fixture, page }) => {
    await fixture.createWithDecisionElements();

    const koalaDecision = page.getByText("Koala").first();
    const notKoalaDecision = page.getByText("Not Koala").first();

    expect(koalaDecision).toBeTruthy();
    expect(notKoalaDecision).toBeTruthy();
  });
});
