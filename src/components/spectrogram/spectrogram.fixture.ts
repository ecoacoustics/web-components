import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { Spectrogram } from "./spectrogram";

class TestPage {
  public constructor(public readonly page: Page) {}

  public audioSource = "http://localhost:5173/example.flac";
  public component = () => this.page.locator("oe-spectrogram").first();
  public audioElement = () => this.page.locator("audio").first();

  public async create() {
    await this.page.setContent(`<oe-spectrogram src="${this.audioSource}"></oe-spectrogram>`);
    await this.page.waitForLoadState("networkidle");
  }

  public async updateSlot(content: string) {
    const componentElement = await this.component();
    await componentElement.evaluate((element: HTMLElement, content: string) => {
      element.innerHTML = content;
    }, content);
  }

  public async play() {
    const componentElement = await this.component();
    await componentElement.evaluate((element: Spectrogram) => {
      element.play();
    });
  }

  public async pause() {
    const componentElement = await this.component();
    await componentElement.evaluate((element: Spectrogram) => {
      element.pause();
    });
  }

  public async isComponentPlaying() {
    const componentElement = await this.component();
    return await componentElement.evaluate((element: Spectrogram) => {
      return element.playing;
    });
  }

  public async isAudioElementPlaying() {
    const audio = await this.audioElement();
    return await audio.evaluate((element: HTMLAudioElement) => {
      return !element.paused;
    });
  }
}

export const spectrogramFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
