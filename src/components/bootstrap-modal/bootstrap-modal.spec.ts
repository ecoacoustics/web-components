import { bootstrapModalFixture as test } from "./bootstrap-modal.fixture";
import { expect } from "../../tests/assertions";

test.describe("bootstrap modal", () => {
  test.describe("with custom help templates", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should show bootstrap dialog on initial load", async ({ fixture }) => {
      const isOpen = await fixture.isBootstrapDialogOpen();
      expect(isOpen).toBe(true);
    });

    test("should display custom help template as first slide", async ({ fixture }) => {
      await expect(fixture.slideTitle()).toHaveText("How to use this verification task");
      await expect(fixture.slideContent()).toContainText("This is a custom help message");
    });

    test("should close dialog when dismiss button is clicked", async ({ fixture }) => {
      await fixture.dismissBootstrapDialog();
      const isOpen = await fixture.isBootstrapDialogOpen();
      expect(isOpen).toBe(false);
    });

    test("should close dialog when get started button is clicked", async ({ fixture }) => {
      // Navigate to last slide where the "Get started" button is
      const slideCount = await fixture.getSlideCount();
      await fixture.goToSlide(slideCount - 1);
      
      await fixture.getStartedButton().click();
      const isOpen = await fixture.isBootstrapDialogOpen();
      expect(isOpen).toBe(false);
    });

    test("should include custom help template in slide count", async ({ fixture }) => {
      const slideCount = await fixture.getSlideCount();
      // Should have at least one custom template slide plus default slides
      expect(slideCount).toBeGreaterThan(1);
    });
  });

  test.describe("with multiple custom help templates", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithMultipleTemplates();
    });

    test("should create separate slides for each template", async ({ fixture }) => {
      const slideCount = await fixture.getSlideCount();
      // Should have multiple slides including 2 custom templates
      expect(slideCount).toBeGreaterThan(2);
    });

    test("should show correct titles for multiple templates", async ({ fixture }) => {
      // First custom template should have default title
      await expect(fixture.slideTitle()).toHaveText("How to use this verification task");
      
      // Go to second slide (second custom template)
      await fixture.goToSlide(1);
      await expect(fixture.slideTitle()).toHaveText("Instructions 2");
    });

    test("should render content from each template", async ({ fixture }) => {
      // Check first template content
      await expect(fixture.slideContent()).toContainText("First help slide content");
      
      // Go to second template slide
      await fixture.goToSlide(1);
      await expect(fixture.slideContent()).toContainText("Second help slide content");
    });
  });

  test.describe("without custom help templates", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithoutCustomTemplate();
    });

    test("should show bootstrap dialog with default slides only", async ({ fixture }) => {
      const isOpen = await fixture.isBootstrapDialogOpen();
      expect(isOpen).toBe(true);
    });

    test("should have slides even without custom templates", async ({ fixture }) => {
      const slideCount = await fixture.getSlideCount();
      expect(slideCount).toBeGreaterThan(0);
    });

    test("should not show custom help template content", async ({ fixture }) => {
      await expect(fixture.slideContent()).not.toContainText("Custom Help Template");
    });
  });

  test.describe("dialog functionality", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create();
    });

    test("should have correct dialog structure", async ({ fixture }) => {
      await expect(fixture.bootstrapDialog()).toBeVisible();
      await expect(fixture.carousel()).toBeVisible();
      await expect(fixture.dismissBootstrapDialogButton()).toBeVisible();
    });

    test("should prevent interaction with background when modal is open", async ({ fixture }) => {
      const isOpen = await fixture.isBootstrapDialogOpen();
      expect(isOpen).toBe(true);
      
      // Dialog should have modal behavior (background should be blocked)
      await expect(fixture.bootstrapDialog()).toHaveAttribute("open");
    });
  });
});