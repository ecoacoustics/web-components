import { Page } from "@playwright/test";
import { expect, test } from "../../tests/assertions";
import { getBrowserValue, invokeBrowserMethod, waitForContentReady } from "../../tests/helpers";
import { Tag } from "../../models/tag";
import { AnnotationComponent } from "./annotation";
import { Annotation } from "../../models/annotation";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-annotation").first();

  public async create(content: string) {
    await this.page.setContent(content);
    await waitForContentReady(this.page);
  }

  public async tagModels(): Promise<ReadonlyArray<Tag>> {
    return (await invokeBrowserMethod<AnnotationComponent>(this.component(), "tagModels" as any)) as Tag[];
  }

  public async annotationModel(): Promise<Readonly<Annotation>> {
    return (await getBrowserValue<AnnotationComponent>(this.component(), "model")) as Annotation;
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

export const annotationFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
