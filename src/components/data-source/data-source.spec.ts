import { dataSourceFixture as test } from "./data-source.fixture";
import { catchLocatorEvent } from "../../tests/helpers";
import { expect } from "../../tests/assertions";

test.describe("data source", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.dismissHelpDialog();
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
    test.describe(`file type ${fileType}`, () => {
      const mockFileName = `test-items-2.${fileType}`;
      // const mockFileContent = [
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "4.846035957336426" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "4.846035957336426" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "4.846035957336426" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "4.958763122558594" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "5.02945613861084" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "5.045819282531738" },
      //   { "AudioLink": "http://localhost:3000/example2.flac", "Distance": "5.081274509429932" }
      // ];

      test.beforeEach(async ({ fixture }) => {
        await fixture.setRemoteFile(`http://localhost:3000/${mockFileName}`);
      });

      test.describe("detecting file type", () => {
        test.skip(`should correctly identify a ${fileType} file type from media type headers`, () => { });

        test.skip(`should correctly identify a ${fileType} file type from file extensions`, () => { });
      });

      // TODO: these tests are currently disabled because they have not been
      // adapted to the new showSaveFilePicker API
      // test.describe("downloading results", () => {
      //   test("should have the correct content for results with no decisions", async ({ fixture }) => {
      //     const expectedResult = mockFileContent.map((row) => ({
      //       ...row,
      //       "oe-tag": "",
      //       "oe-confirmed": "",
      //       "oe-additional-tags": "",
      //     }));
      //     const realizedResult = await fixture.getFileContent();
      //     expect(realizedResult).toEqual(expectedResult);
      //   });

      //   test("should have the correct content for results with entire grid decisions", async ({ fixture }) => {
      //     const expectedResult = mockFileContent.map((row) => ({
      //       ...row,
      //       "oe-tag": "",
      //       "oe-confirmed": "",
      //       "oe-additional-tags": "",
      //     }) as any);

      //     expectedResult[0]["oe-tag"] = "koala";
      //     expectedResult[0]["oe-confirmed"] = "true";
      //     expectedResult[0]["oe-additional-tags"] = ["koala"];

      //     expectedResult[1]["oe-tag"] = "koala";
      //     expectedResult[1]["oe-confirmed"] = "true";
      //     expectedResult[1]["oe-additional-tags"] = ["koala"];

      //     expectedResult[2]["oe-tag"] = "koala";
      //     expectedResult[2]["oe-confirmed"] = "true";
      //     expectedResult[2]["oe-additional-tags"] = ["koala"];

      //     const decisions = [0];
      //     await fixture.makeDecisions(decisions);

      //     const realizedResult = await fixture.getFileContent();
      //     expect(realizedResult).toEqual(expectedResult);
      //   });

      //   // in this test, we make a decision about the second item in the grid
      //   // meaning that the first row should be empty, the second row should
      //   // have the decision, and the third row should be empty
      //   test("should have the correct content for results with a sub-selection", async ({ fixture }) => {
      //     const expectedResult = mockFileContent.map((row) => ({
      //       ...row,
      //       "oe-tag": "",
      //       "oe-confirmed": "",
      //       "oe-additional-tags": "",
      //     }) as any);

      //     const subSelectionIndex = 1;
      //     expectedResult[subSelectionIndex]["oe-tag"] = "koala";
      //     expectedResult[subSelectionIndex]["oe-confirmed"] = "false";
      //     expectedResult[subSelectionIndex]["oe-additional-tags"] = ["koala"];

      //     await fixture.makeSubSelection([1]);
      //     await fixture.makeDecisions([subSelectionIndex]);

      //     const realizedResult = await fixture.getFileContent();
      //     expect(realizedResult).toEqual(expectedResult);
      //   });
      // });
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

  test.fixme("should handle changing from local to remote files", async ({ fixture }) => {
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
