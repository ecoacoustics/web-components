import { Page } from "@playwright/test";
import { setBrowserAttribute, waitForContentReady } from "../../tests/helpers/helpers";
import { ProgressBar } from "./progress-bar";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-progress-bar").first();
  public completedSegment = () => this.page.locator(".completed-segment").first();
  public viewHeadSegment = () => this.page.locator(".head-segment").first();

  public async create() {
    const content = `
      <oe-progress-bar
        total="100"
        history-head="0"
        completed="0"
      ></oe-progress-bar>
    `;

    await setContent(this.page, content);

    await waitForContentReady(this.page, ["oe-progress-bar"]);
  }

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

export const progressBarFixture = createFixture(TestPage);
