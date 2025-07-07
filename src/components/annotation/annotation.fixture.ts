import { Page } from "@playwright/test";
import { expect } from "../../tests/assertions";
import { getBrowserValue, invokeBrowserMethod, waitForContentReady } from "../../tests/helpers";
import { Tag } from "../../models/tag";
import { AnnotationComponent } from "./annotation";
import { Annotation } from "../../models/annotation";
import { createFixture } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-annotation").first();

  public defaultContent = `
    <oe-annotation
      tags="dog,cat"
      low-frequency="0"
      high-frequency="1000"
      start-time="0"
      end-time="5"
    ></oe-annotation>
  `;

  public async create(content = this.defaultContent) {
    await this.page.setContent(content);
    await waitForContentReady(this.page);
  }

  public async tagModels(): Promise<ReadonlyArray<Tag>> {
    return await invokeBrowserMethod<AnnotationComponent, Tag[]>(this.component(), "tagModels" as any);
  }

  public async annotationModel(): Promise<Readonly<Annotation>> {
    return await getBrowserValue<AnnotationComponent, Annotation>(this.component(), "model");
  }

  public async assertAnnotationModel(expected: any) {
    const realized = await this.annotationModel();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reference: _realizedRef, ...restRealizedModel } = realized;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reference: _expectedRef, ...restExpectedModel } = expected;

    expect(restRealizedModel).toEqual(restExpectedModel);
  }
}

export const annotationFixture = createFixture(TestPage);
