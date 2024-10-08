import { Page } from "@playwright/test";
import { setBrowserAttribute } from "../../tests/helpers";
import { ProgressBar } from "./progress-bar";
import { test } from "../../tests/assertions";

class ProgressBarFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-progress-bar").first();
  public completedSegment = () => this.page.locator(".completed-segment").first();
  public viewHeadSegment = () => this.page.locator(".head-segment").first();

  public async completedSegmentSize(): Promise<string> {
    return await this.completedSegment().evaluate((element: HTMLSpanElement) => element.style.width);
  }

  public async viewHeadSegmentSize(): Promise<string> {
    return await this.viewHeadSegment().evaluate((element: HTMLSpanElement) => element.style.width);
  }

  public async changeViewHead(value: number) {
    await setBrowserAttribute<ProgressBar>(this.component(), "history-head" as keyof ProgressBar, value.toString());
  }

  public async changeCompletedHead(value: number) {
    await setBrowserAttribute<ProgressBar>(this.component(), "completed", value.toString());
  }
}

export const progressBarFixture = test.extend<{ fixture: ProgressBarFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new ProgressBarFixture(page);
    await run(fixture);
  },
});
