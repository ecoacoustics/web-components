import { dataSourceFixture as test } from "./data-source.fixture";
import { catchLocatorEvent } from "../../tests/helpers";
import { expect } from "../../tests/assertions";

test.describe("data source", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  [false, true].forEach((localFile: boolean) => {
    const loadFileText = localFile ? "local file" : "remote file";

    test.describe(`loading from a ${loadFileText}`, () => {
      test.beforeEach(async ({ fixture }) => {
        if (localFile) {
          await fixture.setLocalFile();
          return;
        }

        await fixture.setRemoteFile("http://localhost:3000/example.flac");
      });

      test.skip(`should handle removing the source correctly with ${loadFileText}`, () => { });

      test.skip(`should show the correct file name with ${loadFileText}`, () => { });

      test.skip(`should have the correct file type for a json ${loadFileText}`, () => { });

      test.skip(`should have the correct file type for a csv file ${loadFileText}`, () => { });
    });
  });

  // TODO: finish these tests
  ["json", "csv", "tsv"].forEach((fileType) => {
    test.describe(`detecting file type ${fileType}`, () => {
      test.beforeEach(async () => { });

      test.skip(`should correctly identify a ${fileType} file type from media type headers`, () => { });

      test.skip(`should correctly identify a ${fileType} file type from file extensions`, () => { });
    });
  });

  test("should handle having no source correctly with local files", async ({ fixture }) => {
    const expectedLocalFileInputText = "Browse files";
    await fixture.setLocalAttribute(true);
    expect(fixture.filePicker()).toHaveText(expectedLocalFileInputText);
  });

  test("should handle having no source correctly with remote files", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    expect(fixture.filePicker()).not.toBeAttached();
  });

  test("should use a custom button for local file inputs", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    expect(fixture.browserFileInput()).not.toBeVisible();
  });

  test("should use browser native file input apis for local file inputs", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    const fileInputEvent = catchLocatorEvent(fixture.browserFileInput(), "change");
    await fixture.localFileInputButton().click();

    // TODO: Check if we are really expecting a promise rejection here
    expect(fileInputEvent).rejects.toBeTruthy();
  });

  // TODO: this functionality is a stretch goal
  test.skip("should allow dragging and dropping a file onto local file inputs", () => { });

  test.skip("should not allow dragging and dropping a file onto local file inputs", () => { });

  test("should handle changing from local to remote files", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    expect(fixture.filePicker()).toBeAttached();

    await fixture.setLocalAttribute(false);
    expect(fixture.filePicker()).not.toBeAttached();
  });

  test("should handle changing from remote to local files", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    expect(fixture.filePicker()).not.toBeAttached();

    await fixture.setLocalAttribute(true);
    expect(fixture.filePicker()).toBeAttached();
  });

  test.skip("should invalidate local file source when switching to a remote file", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    expect(await fixture.getFileName()).toBe("example.flac");

    await fixture.setLocalAttribute(true);
    expect(await fixture.getFileName()).toBe("");
  });

  test.skip("should invalidate remote source when switching to a local file", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    expect(await fixture.getFileName()).toBe("");

    await fixture.setLocalAttribute(false);
    expect(await fixture.getFileName()).toBe("example.flac");
  });
});
