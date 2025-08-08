import { dataSourceFixture as test } from "./data-source.fixture";
import { catchLocatorEvent, insertContent, setBrowserAttribute } from "../../tests/helpers";
import { expect } from "../../tests/assertions";

test.describe("data source", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.dismissBootstrapDialog();
  });

  // [false, true].forEach((localFile: boolean) => {
  //   const loadFileText = localFile ? "local file" : "remote file";
  //
  //   test.describe(`loading from a ${loadFileText}`, () => {
  //     test.beforeEach(async ({ fixture }) => {
  //       if (localFile) {
  //         await fixture.setLocalFile("../../../public/example/test-items.json");
  //         return;
  //       }
  //
  //       await fixture.setRemoteFile("http://localhost:3000/test-items.json");
  //     });
  //
  //     test(`should correctly handle removing the data source`, () => {});
  //
  //     test(`should show the correct file name`, () => {});
  //   });
  // });

  ["json", "csv", "tsv"].forEach((fileType) => {
    test.describe(`file type ${fileType}`, () => {
      const mockFileName = `test-items-2.${fileType}`;

      test.beforeEach(async ({ fixture }) => {
        await fixture.setRemoteFile(`http://localhost:3000/${mockFileName}`);
      });

      test.describe("detecting file type", () => {
        test.skip(`should correctly identify a ${fileType} file type from media type headers`, () => {});

        test.skip(`should correctly identify a ${fileType} file type from file extensions`, () => {});
      });

      test.describe("downloading results", () => {
        // This test is extremely flakey in CI Firefox
        // TODO: Re-enable this test
        test.skip("should have the correct content for results with entire grid decisions", async ({ fixture }) => {
          const originalFileContent = await fixture.getDownloadResults();

          // we expect that the oe_frog column has been added to the results
          // because we make an additional tags decision where the additional
          // tag is "frog"
          const expectedResult = originalFileContent;
          expectedResult[0]["oe_tag"] = "koala";
          expectedResult[0]["oe_confirmed"] = "true";
          expectedResult[0]["oe_frog"] = "true";

          expectedResult[1]["oe_tag"] = "koala";
          expectedResult[1]["oe_confirmed"] = "true";
          expectedResult[1]["oe_frog"] = "true";

          expectedResult[2]["oe_tag"] = "koala";
          expectedResult[2]["oe_confirmed"] = "true";
          expectedResult[2]["oe_frog"] = "true";

          await fixture.sendDecision("additional-tags");

          const realizedResult = await fixture.getDownloadResults();
          expect(realizedResult).toEqual(expectedResult);
        });

        // in this test, we make a decision about the second item in the grid
        // meaning that the first row should be empty, the second row should
        // have the decision, and the third row should be empty
        test("should have the correct content for results with a sub-selection", async ({ fixture }) => {
          const originalFileContent = await fixture.getDownloadResults();
          const subSelectionIndex = 1;

          const expectedResult = originalFileContent;
          expectedResult[subSelectionIndex]["oe_tag"] = "koala";
          expectedResult[subSelectionIndex]["oe_confirmed"] = "false";

          await fixture.makeSubSelection([subSelectionIndex]);
          await fixture.sendDecision("false");

          const realizedResult = await fixture.getDownloadResults();
          expect(realizedResult).toEqual(expectedResult);
        });
      });
    });
  });

  test.describe("allow-downloads", () => {
    test("should have download button if not present", async ({ fixture }) => {
      await expect(fixture.downloadResultsButton()).toBeVisible();
    });

    test("should have download button visible if set", async ({ fixture }) => {
      // We need this "as any" type cast because the setBrowserAttribute
      // function checks the property keys, and not attributes.
      // TODO: remove this type cast once the helper's typing issue is fixed
      await setBrowserAttribute(fixture.component(), "allow-downloads" as any, "true");
      await expect(fixture.downloadResultsButton()).toBeVisible();
    });

    test("should not have download button if explicitly disabled", async ({ fixture }) => {
      await setBrowserAttribute(fixture.component(), "allow-downloads" as any, "false");
      await expect(fixture.downloadResultsButton()).toBeHidden();
    });
  });

  test.describe("slotted content", () => {
    test("should use the default 'Download Results' text", async ({ fixture }) => {
      await expect(fixture.downloadResultsPrompt()).toHaveSlottedText("Download Results");
    });

    test("should allow slotting custom content as the download prompt", async ({ fixture }) => {
      const testedText = "Hello World!";
      await insertContent(fixture.component(), testedText);
      await expect(fixture.downloadResultsPrompt()).toHaveSlottedText(testedText);
    });
  });

  test("should handle having no source correctly with local files", async ({ fixture }) => {
    const expectedLocalFileInputText = "Browse files";
    await fixture.setLocalAttribute(true);
    await expect(fixture.localFileInputButton()).toHaveText(expectedLocalFileInputText);
  });

  test("should handle having no source correctly with remote files", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    await expect(fixture.localFileInputButton()).not.toBeAttached();
  });

  test("should use a custom button for local file inputs", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    await expect(fixture.browserFileInput()).toBeHidden();
  });

  // TODO: fix in https://github.com/ecoacoustics/web-components/issues/86
  test.fixme("should use browser native file input apis for local file inputs", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    const fileInputEvent = await catchLocatorEvent(fixture.browserFileInput(), "change");
    await fixture.localFileInputButton().click();

    // TODO: Check if we are really expecting a promise rejection here
    await expect(fileInputEvent).rejects.toBeTruthy();
  });

  // TODO: this functionality is a stretch goal
  test.skip("should allow dragging and dropping a file onto local file inputs", () => {});

  test.skip("should not allow dragging and dropping a file onto local file inputs", () => {});

  test("should handle changing from local to remote files", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    await expect(fixture.localFileInputButton()).toBeAttached();

    await fixture.setLocalAttribute(false);
    await expect(fixture.localFileInputButton()).not.toBeAttached();
  });

  test("should handle changing from remote to local files", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    await expect(fixture.localFileInputButton()).not.toBeAttached();

    await fixture.setLocalAttribute(true);
    await expect(fixture.localFileInputButton()).toBeAttached();
  });

  test.skip("should invalidate local file source when switching to a remote file", async ({ fixture }) => {
    await fixture.setLocalAttribute(false);
    expect(await fixture.getFileName()).toEqual("example.flac");

    await fixture.setLocalAttribute(true);
    expect(await fixture.getFileName()).toEqual("");
  });

  test.skip("should invalidate remote source when switching to a local file", async ({ fixture }) => {
    await fixture.setLocalAttribute(true);
    expect(await fixture.getFileName()).toEqual("");

    await fixture.setLocalAttribute(false);
    expect(await fixture.getFileName()).toEqual("example.flac");
  });
});
