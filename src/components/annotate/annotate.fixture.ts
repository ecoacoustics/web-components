import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { waitForContentReady } from "../../tests/helpers";
import { AnnotationTagStyle } from "./annotate";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-annotate").first();
  public annotationContainers = () => this.page.locator(".annotation-container").all();
  public annotationBoundingBoxes = () => this.page.locator(".bounding-box").all();
  public annotationHeadings = () => this.page.locator(".bounding-box-heading").all();

  public spectrogram = () => this.page.locator("oe-spectrogram").first();

  public async annotation(index: number) {
    const annotations = await this.annotationBoundingBoxes();
    return annotations[index];
  }

  public async create() {
    await this.page.setContent(`
      <oe-annotate>
        <oe-spectrogram src="/example.flac"></oe-spectrogram>

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
            <strong class="slotted-content">Ultrasonic</strong>
          </oe-tag>
        </oe-annotation>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram", "oe-annotation", "oe-tag"]);
  }

  public async createWithTagStyle(tagStyle: AnnotationTagStyle) {
    await this.page.setContent(`
      <oe-annotate tag-style="${tagStyle}">
        <oe-spectrogram src="/example.flac"></oe-spectrogram>

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
            <strong class="slotted-content">Ultrasonic</strong>
          </oe-tag>
        </oe-annotation>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram", "oe-annotation", "oe-tag"]);
  }

  public async createWithoutAnnotations() {
    await this.page.setContent(`
      <oe-annotate>
        <oe-spectrogram src="/example.flac"></oe-spectrogram>
      </oe-annotate>
    `);

    await waitForContentReady(this.page, ["oe-annotate", "oe-spectrogram"]);
  }
}

export const annotateFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
