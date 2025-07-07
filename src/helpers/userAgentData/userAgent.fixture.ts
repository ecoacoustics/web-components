import { Page } from "@playwright/test";
import { hasCtrlLikeModifier, isMacOs } from "./userAgent";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public buttonElement = () => this.page.getByTestId("test-element");

  public async create() {
    await setContent(this.page, "<button data-testid='test-element'>Click Me!</button>");

    await this.page.addScriptTag({
      content: isMacOs.toString(),
    });

    await this.page.addScriptTag({
      content: hasCtrlLikeModifier.toString(),
    });
  }

  // For the ground truth, I don't want to use the navigator.userAgentData
  // because the isMacOs helper uses this object to determine if the platform
  // is MacOs or not. So I therefore want to assert against a different source
  // or truth.
  public isNodeMac(): boolean {
    return process.platform === "darwin";
  }
}

export const userAgentDataFixture = createFixture(TestPage);
