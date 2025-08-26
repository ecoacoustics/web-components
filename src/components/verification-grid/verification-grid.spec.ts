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

  test("should place decision elements in the correct location", async ({ fixture }) => {
    await fixture.createWithDecisionElements();

    const koalaDecision = fixture.page.getByText("Koala").first();
    const notKoalaDecision = fixture.page.getByText("Not Koala").first();

    expect(koalaDecision).toBeTruthy();
    expect(notKoalaDecision).toBeTruthy();
  });

  test("should render custom help content in bootstrap dialog when help-bootstrap slot is provided", async ({ fixture }) => {
    await fixture.createWithHelpBootstrapSlot();

    // Click the help button to open the bootstrap dialog
    await fixture.helpButton().click();

    // Wait for the dialog to open
    await fixture.bootstrapDialog().waitFor({ state: "visible" });

    // Check that the custom help content is rendered in the dialog
    const customTitle = fixture.page.getByText("Custom Help Content");
    const customDescription = fixture.page.getByText("This is a custom help message for this verification task.");
    
    await expect(customTitle).toBeVisible();
    await expect(customDescription).toBeVisible();
  });
});
