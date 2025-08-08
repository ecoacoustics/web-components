import { Page } from "@playwright/test";
import { getBrowserValue, setBrowserValue, waitForContentReady } from "../../tests/helpers";
import { InfoCardComponent } from "./info-card";
import { Subject, SubjectWrapper } from "../../models/subject";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-info-card").first();
  public downloadRecordingButton = () => this.page.locator("#download-recording").first();
  public showMoreButton = () => this.page.locator("#show-more").first();
  public subjectContent = () => this.page.locator(".subject-content").first();

  public testAudioUrl = "http://localhost:3000/example.flac";

  public async create() {
    await setContent(this.page, `<oe-info-card></oe-info-card>`);
    await waitForContentReady(this.page, ["oe-info-card"]);
  }

  public async changeSubject(subject: Subject) {
    const initialTag = null;
    const model = new SubjectWrapper(subject, this.testAudioUrl, initialTag);

    await setBrowserValue<InfoCardComponent>(this.component(), "model", model);
  }

  public async subjectUrl(): Promise<string> {
    const model = await getBrowserValue<InfoCardComponent, SubjectWrapper>(this.component(), "model");
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
    return await getBrowserValue<HTMLAnchorElement, string>(this.downloadRecordingButton(), "href");
  }
}

export const infoCardFixture = createFixture(TestPage);
