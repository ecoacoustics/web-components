import { Page } from "@playwright/test";
import { catchEvent, removeBrowserAttribute, setBrowserAttribute, waitForContentReady } from "../../../tests/helpers";
import { ClassificationComponent } from "./classification";
import { DecisionEvent } from "../decision";
import { test } from "../../../tests/assertions";

class ClassificationComponentFixture {
  constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-classification").first();
  public shortcutLegends = () => this.page.locator("kbd").all();
  public decisionOptions = () => this.page.locator(".button-text").all();
  public colorPills = () => this.page.locator(".decision-color-pill").all();
  public decisionTitle = () => this.page.locator(".decision-group-title").first();

  public decisionButtons = () => this.page.locator(".decision-button").all();
  public decisionTrueButton = () => this.page.getByText("true").first();
  public decisionFalseButton = () => this.page.getByText("false").first();

  public async create() {
    // pull the tag out of the `tag` attribute
    await this.page.setContent("<oe-classification tag='koala'></oe-classification>");

    await waitForContentReady(this.page, [".decision-button"]);

    // mock the verification grid by binding it to the document object
    // this means that we can test that the shortcut keys work correctly without
    // having to create the entire verification grid
    // shortcut keys + integration testing is tested in the verification grid
    // e2e tests
    await this.component().evaluate((element: ClassificationComponent) => {
      element.verificationGrid = document as any;
    });
  }

  public decisionEvent() {
    return catchEvent<DecisionEvent>(this.page, "decision");
  }

  public async getShortcutLegends(): Promise<(string | null)[]> {
    const elements = await this.shortcutLegends();
    return await Promise.all(elements.map((element) => element.textContent()));
  }

  public async getDecisionOptions(): Promise<(string | null)[]> {
    const elements = await this.decisionOptions();
    return await Promise.all(elements.map((element) => element.textContent()));
  }

  // when a classification component is created, we expect it to have two
  // buttons, one for true and one for false
  // therefore, we can restrict the index to 0 or 1
  public async makeDecision(index: 0 | 1) {
    const buttons = await this.decisionButtons();
    await buttons[index].click();
  }

  public async makeTrueDecision() {
    await this.makeDecision(0);
  }

  public async makeFalseDecision() {
    await this.makeDecision(1);
  }

  public async changeTag(tag: string) {
    await setBrowserAttribute<ClassificationComponent>(this.component(), "tag", tag);
  }

  public async changeTrueShortcut(value: string) {
    await setBrowserAttribute<ClassificationComponent>(
      this.component(),
      "true-shortcut" as keyof ClassificationComponent,
      value,
    );
  }

  public async changeFalseShortcut(value: string) {
    await setBrowserAttribute<ClassificationComponent>(
      this.component(),
      "false-shortcut" as keyof ClassificationComponent,
      value,
    );
  }

  public async changeDecisionDisabled(disabled: boolean) {
    const disabledAttributeName = "disabled";

    if (!disabled) {
      await removeBrowserAttribute<ClassificationComponent>(this.component(), disabledAttributeName);
    } else {
      await setBrowserAttribute<ClassificationComponent>(this.component(), disabledAttributeName);
    }
  }
}

export const classificationFixture = test.extend<{ fixture: ClassificationComponentFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new ClassificationComponentFixture(page);
    await run(fixture);
  },
});
