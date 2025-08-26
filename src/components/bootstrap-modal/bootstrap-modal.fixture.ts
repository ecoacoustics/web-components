import { Page } from "@playwright/test";
import { createFixture, setContent } from "../../tests/fixtures";
import { waitForContentReady } from "../../tests/helpers";

class TestPage {
  public constructor(public readonly page: Page) {}

  public bootstrapComponent = () => this.page.locator("oe-verification-bootstrap").first();
  public bootstrapDialog = () => this.page.locator("#dialog-element").first();
  public dismissBootstrapDialogButton = () => this.page.getByTestId("dismiss-bootstrap-dialog-btn").first();
  public slideTitle = () => this.page.locator(".slide-title").first();
  public slideContent = () => this.page.locator(".slide-content").first();
  public carousel = () => this.page.locator("#tutorial-slide-carousel").first();
  public carouselItems = () => this.page.locator("sl-carousel-item");
  public getStartedButton = () => this.page.getByText("Get started");

  public async create() {
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid">
        <oe-verification-bootstrap>
          <template>
            <h1>Custom Help Template</h1>
            <p>This is a custom help message.</p>
          </template>
        </oe-verification-bootstrap>
        <oe-verification verified="true">Correct</oe-verification>
        <oe-verification verified="false">Incorrect</oe-verification>
      </oe-verification-grid>
      `,
      [],
    );

    await waitForContentReady(this.page);
  }

  public async createWithMultipleTemplates() {
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid">
        <oe-verification-bootstrap>
          <template>
            <h1>Step 1: Overview</h1>
            <p>First help slide content.</p>
          </template>
          <template>
            <h1>Step 2: Details</h1>
            <p>Second help slide content.</p>
          </template>
        </oe-verification-bootstrap>
        <oe-verification verified="true">Correct</oe-verification>
        <oe-verification verified="false">Incorrect</oe-verification>
      </oe-verification-grid>
      `,
      [],
    );

    await waitForContentReady(this.page);
  }

  public async createWithoutCustomTemplate() {
    await setContent(
      this.page,
      `
      <oe-verification-grid id="verification-grid">
        <oe-verification-bootstrap></oe-verification-bootstrap>
        <oe-verification verified="true">Correct</oe-verification>
        <oe-verification verified="false">Incorrect</oe-verification>
      </oe-verification-grid>
      `,
      [],
    );

    await waitForContentReady(this.page);
  }

  public async dismissBootstrapDialog() {
    await this.dismissBootstrapDialogButton().click();
  }

  public async isBootstrapDialogOpen(): Promise<boolean> {
    return await this.bootstrapDialog().evaluate((element: HTMLDialogElement) => element.open);
  }

  public async getSlideCount(): Promise<number> {
    return await this.carouselItems().count();
  }

  public async goToSlide(slideIndex: number) {
    await this.carousel().evaluate((carousel: any, index: number) => {
      carousel.goToSlide(index);
    }, slideIndex);
  }
}

export const bootstrapModalFixture = createFixture(TestPage);