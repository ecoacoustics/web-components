import { Page } from "@playwright/test";
import { MediaControlsComponent } from "./media-controls";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { expect, test } from "../../tests/assertions";
import { setBrowserAttribute, waitForContentReady } from "../../tests/helpers/helpers";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-media-controls").first();
  public actionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public actionButtonSlot = () => this.page.locator("oe-media-controls #action-button > slot").first();
  public spectrogram = () => this.page.locator("oe-spectrogram").first();

  public spectrogramId = "spectrogram";

  /**
   * Creates a test fixture where the media controls is linked to the
   * spectrogram by passing a spectrogram id to the "for" attribute.
   */
  public async createWithId(slotTemplate = "") {
    await this.page.setContent(`
        <oe-spectrogram
          id="${this.spectrogramId}"
          src="http://localhost:3000/example.flac"
          style="display: relative; width: 100px; height: 100px;"
        ></oe-spectrogram>
        <oe-media-controls for="spectrogram">
            ${slotTemplate}
        </oe-media-controls>
    `);
    await this.waitUntilLoaded();
  }

  /**
   * Creates a test fixture where the media controls is linked to the
   * spectrogram by passing an element reference to the "for" property.
   */
  public async createWithRef() {
    await this.page.setContent(`
        <oe-spectrogram
          id="${this.spectrogramId}"
          src="http://localhost:3000/example.flac"
          style="display: relative; width: 100px; height: 100px;"
        ></oe-spectrogram>
        <oe-media-controls></oe-media-controls>
    `);
    await this.waitUntilLoaded();

    await this.setForElementReference();
  }

  /** Changes the media controls "for" attribute to use an element reference */
  public async setForElementReference() {
    await this.spectrogram().evaluate((spectrogramElement: SpectrogramComponent) => {
      // We know that the media controls component will exist because we created
      // it in the fixture above.
      // Therefore, it is safe to type cast.
      const mediaControls = document.querySelector("oe-media-controls") as MediaControlsComponent;
      mediaControls.for = spectrogramElement;
    });
  }

  /** Changes the media controls "for" attribute to use an element id */
  public async setForElementId() {
    await setBrowserAttribute<MediaControlsComponent>(this.component(), "for", this.spectrogramId);
  }

  public async updateSlot(content: string) {
    const componentElement = this.component();
    await componentElement.evaluate((element: MediaControlsComponent, content: string) => {
      element.innerHTML = content;
    }, content);
  }

  public async toggleAudio() {
    const actionButtonElement = this.actionButton();

    // TODO: Fix this bug
    // We use force: true here because slotted content sometimes does not result
    // in a correct touch target.
    //
    // eslint-disable-next-line playwright/no-force-option
    await actionButtonElement.click({ force: true });
  }

  public async isPlayingAudio() {
    const audioElement = this.spectrogram();
    return await audioElement.evaluate((element: SpectrogramComponent) => !element.paused);
  }

  public async actionButtonSlotText(): Promise<(string | null)[]> {
    const actionButtonSlotElement = this.actionButtonSlot();
    return await actionButtonSlotElement.evaluate((element: HTMLSlotElement) =>
      element.assignedElements().map((element) => element.textContent),
    );
  }

  public async actionButtonStyles() {
    const actionButtonElement = this.actionButtonSlot();
    return await actionButtonElement.evaluate((element: HTMLButtonElement) => {
      const styles = window.getComputedStyle(element);

      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      };
    });
  }

  private async waitUntilLoaded() {
    await waitForContentReady(this.page, ["oe-media-controls", "oe-spectrogram"]);
    await expect(this.component()).toBeVisible();
  }
}

export const mediaControlsFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.createWithId();
    await run(fixture);
  },
});
