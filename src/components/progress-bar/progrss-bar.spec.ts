import { expect } from "../../tests/assertions";
import { progressBarFixture as test } from "./progrss-bar.fixture";

test.describe("ProgressBar", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should not have a completed segment if there are no decisions", async ({ fixture }) => {
    const completedSegments = await fixture.completedSegment().count();
    expect(completedSegments).toBe(0);
  });

  test("should not have a view head segment if there are no decisions", async ({ fixture }) => {
    const headSegments = await fixture.viewHeadSegment().count();
    expect(headSegments).toBe(0);
  });

  test("should have the correct segment sizes when the view head and completed head is set", async ({ fixture }) => {
    const viewHeadValue = 10;
    const completedValue = 20;

    await fixture.changeViewHead(viewHeadValue);
    await fixture.changeCompletedHead(completedValue);

    const expectedHeadSegmentSize = "10%";
    const expectedCompletedHeadSize = "10%";

    const headSegmentSize = await fixture.viewHeadSegmentSize();
    const completedSegmentSize = await fixture.completedSegmentSize();

    expect(headSegmentSize).toBe(expectedHeadSegmentSize);
    expect(completedSegmentSize).toBe(expectedCompletedHeadSize);
  });

  test("should use panel-color-dark for background to provide contrast", async ({ fixture }) => {
    const component = fixture.component();
    
    const backgroundColor = await component.evaluate((element: ProgressBar) => {
      const shadowRoot = element.shadowRoot;
      if (!shadowRoot) return null;
      
      const progressBarElement = shadowRoot.querySelector('.progress-bar') as HTMLElement;
      if (!progressBarElement) return null;
      
      return window.getComputedStyle(progressBarElement).backgroundColor;
    });

    const panelColor = await fixture.page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--oe-panel-color').trim();
    });

    // The background should be different from the panel color to provide contrast
    expect(backgroundColor).not.toBe(panelColor);
    expect(backgroundColor).toBeTruthy();
  });
});
