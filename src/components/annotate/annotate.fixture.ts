import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { mockDeviceSize, testBreakpoints, waitForContentReady } from "../../tests/helpers";
import { AnnotationTagStyle } from "./annotate";
import { PartialAnnotation } from "./annotate.spec";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { EnumValue } from "../../helpers/types/advancedTypes";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-annotate").first();
  public tagComponents = () => this.page.locator("oe-tag").all();

  public annotations = () => this.page.locator("oe-annotation").all();
  public annotationContainers = () => this.page.locator(".annotation-container").all();
  public annotationBoundingBoxes = () => this.page.locator(".bounding-box").all();
  public annotationLabels = () => this.page.locator(".bounding-box-label").all();

  public annotationTopLabels = () => this.page.locator(".bounding-box-label.style-spectrogram-top").all();
  public annotationEdgeLabels = () => this.page.locator(".bounding-box-label.style-edge").all();

  public spectrogram = () => this.page.locator("oe-spectrogram").first();
  public spectrogramContainer = () => this.spectrogram().locator("#spectrogram-container").first();
  public spectrogramCanvas = () => this.spectrogram().locator("canvas").first();

  public chromeTop = () => this.spectrogram().locator(".chrome-top").first();
  public chromeOverlay = () => this.spectrogram().locator(".chrome-overlay").first();

  public async annotationBox(index: number) {
    const annotations = await this.annotationBoundingBoxes();
    return annotations[index];
  }

  public async annotationLabel(index: number) {
    const labels = await this.annotationLabels();
    return labels[index];
  }

  public async tagComponent(index: number) {
    const tags = await this.tagComponents();
    return tags[index];
  }

  public async create(tagStyle?: EnumValue<AnnotationTagStyle>) {
    await this.page.setContent(`
      ${tagStyle ? `<oe-annotate tag-style="${tagStyle}">` : "<oe-annotate>"}
        <oe-spectrogram src="http://localhost:3000/example.flac"></oe-spectrogram>

        <oe-annotation
          data-testid="annotation-attribute-tag"
          tags="bird"
          start-time="0.4"
          end-time="4.99"
          low-frequency="6500"
          high-frequency="8500"
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
          data-testid="annotation-slotted-tag"
          start-time="2.93"
          end-time="3.32"
          low-frequency="8000"
          high-frequency="9900"
        >
          <oe-tag value="bat-slotted">Bat Slotted</oe-tag>
          <oe-tag value="ultrasonic">
            <strong class="slotted-content">Ultrasonic Slotted</strong>
          </oe-tag>
        </oe-annotation>

        <oe-annotation
          data-testid="annotation-mixed-tags"
          tags="bat-attribute"
          start-time="1.93"
          end-time="2.32"
          low-frequency="1000"
          high-frequency="4900"
        >
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
        ></oe-spectrogram>

        <oe-annotation
          data-testid="annotation-attribute-tag"
          tags="kookaburra"
          start-time="${model.startOffset}"
          end-time="${model.endOffset}"
          low-frequency="${model.lowFrequency}"
          high-frequency="${model.highFrequency}"
        ></oe-annotation>
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
    const viewportMock = mockDeviceSize(testBreakpoints.desktop);
    await viewportMock(this.page);

    await this.page.addStyleTag({
      content: `
        oe-spectrogram {
          width: 1280px;
          height: 720px;
        }
      `,
    });

    await this.spectrogramCanvas().evaluate((element: SpectrogramComponent) => {
      element.style.visibility = "hidden";
    });

    await this.spectrogramContainer().evaluate((element: HTMLDivElement) => {
      element.style.backgroundColor = "black";
    });

    const targetAnnotationLabels = await this.annotationLabels();
    for (const label of targetAnnotationLabels) {
      await label.evaluate((element: HTMLHeadingElement) => {
        // we make the annotation font color the same as the annotation color
        // so that the text is not visible and we are only asserting over the
        // bounding box and label positioning
        element.style.setProperty("--oe-annotation-font-color", "var(--oe-annotation-color)");
      });
    }
  }

  // the move into view and move outside view functions
  public async moveAnnotationOutsideView(index = 0) {
    await this.updateAnnotation(index, {
      startOffset: -2,
      endOffset: -1,
      lowFrequency: 1000,
      highFrequency: 2000,
    });
  }

  public async moveAnnotationInsideView(index = 0) {
    await this.updateAnnotation(index, {
      startOffset: 0.5,
      endOffset: 1.5,
      lowFrequency: 1500,
      highFrequency: 2500,
    });
  }

  public async removeAnnotation(index = 0) {
    const targetAnnotation = (await this.annotations())[index];
    await targetAnnotation.evaluate((element: HTMLElement) => {
      element.remove();
    });
  }

  public annotationSelectedColor() {}

  public annotationColor() {}

  private async updateAnnotation(index: number, newModel: PartialAnnotation) {
    const targetAnnotation = (await this.annotations())[index];

    await targetAnnotation.evaluate((element: HTMLElement, model: PartialAnnotation) => {
      element.setAttribute("start-time", model.startOffset.toString());
      element.setAttribute("end-time", model.endOffset.toString());
      element.setAttribute("low-frequency", model.lowFrequency.toString());
      element.setAttribute("high-frequency", model.highFrequency.toString());
    }, newModel);
  }
}

export const annotateFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
