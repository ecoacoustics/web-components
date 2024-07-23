import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { DecisionWrapper, VerificationSubject } from "../../models/verification";
import { getBrowserValue, setBrowserValue } from "../../tests/helpers";
import { InfoCardComponent } from "./info-card";

class TestPage {
  public constructor(public readonly page: Page) { }

  public component = () => this.page.locator("oe-info-card").first();
  public downloadRecordingButton = () => this.page.locator("#download-recording").first();
  public showMoreButton = () => this.page.locator("#show-more").first();
  public subjectContent = () => this.page.locator(".subject-content").first();

  public testAudioUrl = "http://localhost:3000/example.flac";

  public async create() {
    await this.page.setContent(`<oe-info-card></oe-info-card>`);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-info-card");
  }

  public async changeSubject(subject: VerificationSubject) {
    const model = new DecisionWrapper({
      url: this.testAudioUrl,
      decisions: [],
      tag: "",
      subject,
    });

    await setBrowserValue<InfoCardComponent>(this.component(), "model", model);
  }

  public async subjectUrl(): Promise<string> {
    const model = (await getBrowserValue<InfoCardComponent>(this.component(), "model")) as DecisionWrapper;
    return model.url;
  }

  public async infoCardItems() {
    const element = this.subjectContent();

    return await element.evaluate((el) => {
      return Array.from(el.children).map((child) => {
        return {
          key: child.querySelector(".subject-key")?.textContent,
          value: child.querySelector(".subject-value")?.textContent,
        };
      });
    });
  }

  public async audioDownloadLocation(): Promise<string> {
    const value = await getBrowserValue<HTMLAnchorElement>(this.downloadRecordingButton(), "href");
    return value as string;
  }
}

export const infoCardFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
