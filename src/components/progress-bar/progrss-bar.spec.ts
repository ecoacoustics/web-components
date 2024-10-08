import { expect } from "../../tests/assertions";
import { ProgressBar } from "./progress-bar";
import { progressBarFixture as test } from "./progrss-bar.fixture";

test.describe("ProgressBar", () => {
  test.beforeEach(async ({ fixture, mount }) => {
    await mount(ProgressBar, {
      props: {
        total: 100,
        historyHead: 0,
        completed: 0,
      },
    });
    await fixture.page.waitForLoadState("networkidle");
    await fixture.page.waitForSelector("oe-progress-bar");
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
});
