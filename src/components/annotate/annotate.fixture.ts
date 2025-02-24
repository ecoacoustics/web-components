import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { waitForContentReady } from "../../tests/helpers";
import { AnnotationTagStyle } from "./annotate";
import { PartialAnnotation } from "./annotate.spec";
import { SpectrogramComponent } from "../spectrogram/spectrogram";

class TestPage {
  public constructor(public readonly page: Page) {}

  // I use the body element for snapshot (screenshot) assertions
  public bodyElement = () => this.page.locator("body").first();

  public component = () => this.page.locator("oe-annotate").first();
  public tagComponents = () => this.page.locator("oe-tag").all();
  public annotationContainers = () => this.page.locator(".annotation-container").all();
  public annotationBoundingBoxes = () => this.page.locator(".bounding-box").all();
  public annotationLabels = () => this.page.locator(".bounding-box-label").all();

  public spectrogram = () => this.page.locator("oe-spectrogram").first();
  public spectrogramContainer = () => this.spectrogram().locator("#spectrogram-container").first();
  public spectrogramCanvas = () => this.spectrogram().locator("canvas").first();

  public async annotationBox(index: Readonly<number>) {
    const annotations = await this.annotationBoundingBoxes();
    return annotations[index];
  }

  public async annotationLabel(index: Readonly<number>) {
    const labels = await this.annotationLabels();
    return labels[index];
  }

  public async tagComponent(index: Readonly<number>) {
    const tags = await this.tagComponents();
    return tags[index];
  }

  public async create() {
    await this.page.setContent(`
      <oe-annotate>
        <oe-spectrogram src="http://localhost:3000/example.flac"></oe-spectrogram>

        <oe-annotation
          data-testid="annotation-attribute-tag"
          tags="bird"
          start-time="0.4"
          end-time="4.99"
          low-frequency="2500"
          high-frequency="3500"
        ></oe-annotation>

        <oe-annotation
          data-testid="annotation-attribute-tags-multiple"
          tags="cow,male"
          start-time="0.4"
          end-time="4.99"
          low-frequency="2500"
          high-frequency="3500"
        ></oe-annotation>

        <oe-annotation
          data-testid="annotation-component-tag"
          start-time="2.93"
          end-time="3.32"
          low-frequency="8000"
          high-frequency="9900"
        >
          <oe-tag value="bat">Bat</oe-tag>
          <oe-tag value="ultrasonic">
            <strong class="slotted-content">Ultrasonic Slotted</strong>
          </oe-tag>
        </oe-annotation>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram"]);
  }

  public async createWithAnnotation(model: PartialAnnotation) {
    // I use "kookaburra" here because it is a longer tag name. Therefore, it
    // pushes the tag to its limit
    // it also makes it easier to see the annotation label in the test output
    await this.page.setContent(`
      <oe-annotate>
        <oe-spectrogram
          src="http://localhost:3000/example.flac"
          src="/example.flac"
        ></oe-spectrogram>

        <oe-annotation
          data-testid="annotation-attribute-tag"
          tags="kookaburra"
          start-time="${model.startTime}"
          end-time="${model.endTime}"
          low-frequency="${model.lowFrequency}"
          high-frequency="${model.highFrequency}"
        ></oe-annotation>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram"]);
  }

  public async createWithTagStyle(tagStyle: AnnotationTagStyle) {
    await this.page.setContent(`
      <oe-annotate tag-style="${tagStyle}">
        <oe-spectrogram src="http://localhost:3000/example.flac"></oe-spectrogram>

        <oe-annotation
          data-testid="annotation-attribute-tag"
          tags="caterpillar"
          start-time="0.4"
          end-time="4.99"
          low-frequency="2500"
          high-frequency="3500"
        ></oe-annotation>

        <oe-annotation
          data-testid="annotation-attribute-tags-multiple"
          tags="cow,male"
          start-time="0.4"
          end-time="4.99"
          low-frequency="2500"
          high-frequency="3500"
        ></oe-annotation>

        <oe-annotation
          data-testid="annotation-component-tag"
          start-time="2.93"
          end-time="3.32"
          low-frequency="8000"
          high-frequency="9900"
        >
          <oe-tag value="bat">Bat</oe-tag>
          <oe-tag value="ultrasonic">
            <strong class="slotted-content">Ultrasonic</strong>
          </oe-tag>
        </oe-annotation>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram"]);
  }

  public async createWithoutAnnotations() {
    await this.page.setContent(`
      <oe-annotate>
        <oe-spectrogram src="http://localhost:3000/example.flac"></oe-spectrogram>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram"]);
  }

  public async onlyShowAnnotationOutline() {
    await this.page.addStyleTag({
      content: "body { margin: 0; height: max-content; }",
    });

    await this.spectrogramCanvas().evaluate((element: SpectrogramComponent) => {
      element.style.visibility = "hidden";
    });

    await this.spectrogramContainer().evaluate((element: HTMLDivElement) => {
      element.style.backgroundColor = "black";
    });

    const targetBoundingBoxes = await this.annotationBoundingBoxes();
    for (const box of targetBoundingBoxes) {
      box.evaluate((element: HTMLDivElement) => {
        element.style.border = `green 2px solid`;
      });
    }

    const targetAnnotationLabels = await this.annotationLabels();
    for (const label of targetAnnotationLabels) {
      label.evaluate((element: HTMLHeadingElement) => {
        element.style.border = "green 2px solid";
        element.style.backgroundColor = "green";
        element.style.color = "green";
      });
    }
  }
}

export const annotateFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
