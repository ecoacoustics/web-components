import { expect } from "../../tests/assertions";
import { bootstrapModalFixture as test } from "./bootstrap-modal.fixture";

test.beforeEach(async ({ fixture }) => {
  await fixture.create();
});

test.describe("Bootstrap Modal Component", () => {
  test("should show the bootstrap modal on first load", async ({ fixture }) => {
    await expect(fixture.bootstrapModal()).toBeVisible();
  });

  test.describe("close button", () => {
    test("should have a visible close button", async ({ fixture }) => {
      await expect(fixture.closeButton()).toBeVisible();
    });

    test("should render the close button icon", async ({ fixture }) => {
      const icon = fixture.closeButtonIcon();

      await expect(icon).toBeVisible();

      // When sl-icon fails to load (e.g. unregistered icon name), its shadow
      // root is empty. Assert the shadow root contains an SVG with path data to
      // confirm the icon actually rendered.
      const hasSvgContent = await icon.evaluate((element: Element) => {
        const svg = element.shadowRoot?.querySelector("svg");
        return svg?.querySelector("path") !== null;
      });

      expect(hasSvgContent).toBe(true);
    });
  });
});
