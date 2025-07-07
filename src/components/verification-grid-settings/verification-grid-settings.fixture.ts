import { Page } from "@playwright/test";
import {
  catchEvent,
  emitBrowserEvent,
  getBrowserValue,
  setBrowserAttribute,
  setBrowserValue,
  waitForContentReady,
} from "../../tests/helpers";
import { VerificationGridSettingsComponent } from "../verification-grid-settings/verification-grid-settings";
import { VerificationGridComponent } from "../verification-grid/verification-grid";
import { expect } from "../../tests/assertions";
import { createFixture } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public settingsComponent = () => this.page.locator("oe-verification-grid-settings").first();
  public verificationGrid = () => this.page.locator("oe-verification-grid").first();
  public fullscreenButton = () => this.page.locator("#fullscreen-button").first();
  public gridSizeTriggerButton = () => this.page.locator("#grid-size-trigger").first();
  public gridSizeInput = () => this.page.locator("#grid-size-input").first();
  public gridSizeLabel = () => this.page.locator("#grid-size-label").first();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();
  public templateSettingsDropdown = () => this.page.getByTestId("template-dropdown").first();
  public templateTriggerButton = () => this.page.locator("#settings-template-trigger").first();
  public templateCheckboxes = () => this.page.locator(".template-change-input").all();

  public testJsonInput = "http://localhost:3000/test-items.json";

  public async create() {
    await this.page.setContent(`
      <oe-verification-grid
        id="verification-grid"
        grid-size="0"
      ></oe-verification-grid>

      <oe-data-source
        slot="data-source"
        for="verification-grid"
        src="${this.testJsonInput}"
      ></oe-data-source>
    `);
    await waitForContentReady(this.page, ["oe-verification-grid", "oe-verification-grid-settings"]);

    await expect(this.verificationGrid()).toHaveJSProperty("loaded", true);

    // because the bootstrap dialog is shown over all elements, we have to dismiss
    // it before we can interact with the settings component
    await this.dismissBootstrapDialogButton().click();
  }

  public async isFullscreen(): Promise<boolean> {
    return await this.settingsComponent().evaluate((element: VerificationGridSettingsComponent) => {
      // we use peek() instead of the value property so that we don't subscribe
      // to the signal (which can risk a memory leak)
      return element.settings.isFullscreen.peek();
    });
  }

  public async clickFullscreenButton(): Promise<void> {
    const fullscreenButton = this.fullscreenButton();

    // we start listening for the fullscreenchange event before we click the
    // fullscreen button, but await it after we have clicked the button
    // this ensures that there is no race condition between the event listener
    // and the event firing
    const fullscreenCompleteEvent = catchEvent(this.page, "fullscreenchange");
    await fullscreenButton.click();
    await fullscreenCompleteEvent;
  }

  /** Changes the verification grids size through the `grid-size` attribute */
  public async changeVerificationGridSize(newValue: string): Promise<void> {
    // the setBrowserAttribute helper function takes a property key of the
    // component as the second parameter
    // however, because "grid-size" is an attribute, not a property, TypeScript
    // doesn't recognize it as a property. Therefore, we use a type cast here
    // TODO: remove this type casting when we correctly type the helper function
    await setBrowserAttribute<VerificationGridComponent>(
      this.verificationGrid(),
      "grid-size" as keyof VerificationGridComponent,
      newValue,
    );
  }

  /** Changes the verification grids size through the settings component */
  public async changeSettingsGridSize(newGridSize: number): Promise<void> {
    const inputElement = this.gridSizeInput();
    await setBrowserValue<HTMLInputElement>(inputElement, "value", newGridSize);
    await emitBrowserEvent<HTMLInputElement>(inputElement, "change");
  }

  /** Returns the value of the verification grids `grid-size` attribute */
  public async verificationGridSize(): Promise<number> {
    return await getBrowserValue<VerificationGridComponent, number>(this.verificationGrid(), "targetGridSize");
  }

  /** Returns the grid size shown by the grid size settings input */
  public async gridSizeInputValue(): Promise<string> {
    await this.gridSizeTriggerButton().click();
    return await getBrowserValue<HTMLInputElement, string>(this.gridSizeInput(), "value");
  }
}

export const settingsFixture = createFixture(TestPage);
