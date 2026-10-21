import { catchLocatorEvent } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect } from "../assertions";
import { sleep } from "../../helpers/utilities";

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("data sources", () => {
    // TODO: this test is broken/disabled because spectrograms can cover the
    // file input button, causing visibility checks to fail
    // I can only reproduce this in Playwright, not in the browser
    // fix as part of https://github.com/ecoacoustics/web-components/issues/86
    test.fixme("should show a local data source in the correct location", async ({ fixture }) => {
      await fixture.changeSourceLocal(true);
      await expect(fixture.fileInputButton()).toBeVisible();
    });

    test("should not show a remote data source", async ({ fixture }) => {
      await fixture.changeSourceLocal(false);
      await expect(fixture.fileInputButton()).toBeHidden();
    });
  });
});

test.describe("single verification grid", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
    await fixture.page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe("pagination", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.changeGridSize(3);
    });

    test("should disable the previous button when there are no previous pages", async ({ fixture }) => {
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should disable the previous page button when at the start of history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await expect(fixture.previousPageButton()).toBeEnabled();

      await fixture.viewPreviousHistoryPage();
      await expect(fixture.previousPageButton()).toBeDisabled();
    });

    test("should show the next page button when viewing history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("false");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should disable the next button when there are no next pages", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.nextPageButton()).toBeVisible();
    });

    test("should hide the 'Continue Verifying' button when not viewing history", async ({ fixture }) => {
      await expect(fixture.continueVerifyingButton()).toBeHidden();
    });

    test("should show the 'Continue Verifying' button when viewing history", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      await expect(fixture.continueVerifyingButton()).toBeVisible();
      await expect(fixture.continueVerifyingButton()).toBeEnabled();
    });

    test("should start viewing history when the previous page button is clicked", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");
      await fixture.makeVerificationDecision("true");
      await fixture.viewPreviousHistoryPage();
      const isViewingHistory = await fixture.isViewingHistory();

      expect(isViewingHistory).toBe(true);
    });

    test("should stop viewing history when the 'Continue Verifying' button is clicked", async ({ fixture }) => {
      await fixture.makeVerificationDecision("true");

      await fixture.viewPreviousHistoryPage();
      const initialViewingHistory = await fixture.isViewingHistory();
      expect(initialViewingHistory).toBe(true);

      await fixture.continueVerifying();
      const newViewingHistory = await fixture.isViewingHistory();
      expect(newViewingHistory).toBe(false);
    });

    test("should stop playing audio and reset time when the grid auto pages", async ({ fixture }) => {
      await fixture.playSpectrogram(0);
      await fixture.makeVerificationDecision("true");

      // because there is a small delay between a an auto-page being requested
      // and the page actually changing, we need to wait for a short period of
      // time before we can assert the state of the audio
      // the short delay is an intentional feature that allows the user to see
      // that the decision has been applied to the grid before the grid auto pages
      await sleep(1);
      const postPagedPlayingState = await fixture.isAudioPlaying(0);
      const playbackTime = await fixture.audioPlaybackTime(0);

      expect(postPagedPlayingState).toBe(false);
      expect(playbackTime).toBe(0);
    });

    test.describe("shortcut keys", () => {});

    test.describe("auto paging", () => {
      test("should only reset media control options when paging", async ({ fixture }) => {
        const testedSpectrogramIndex = 0;

        // We use a custom template in this test to ensure that if the custom
        // template includes some spectrogram options in the template attributes
        // they are preserved after paging.
        await fixture.createWithValidTemplate();

        // I first want to assert that the custom templates options are being
        // correctly applied and have not been initially overwritten.
        //
        // The custom template should set the spectrograms color map to
        // "grayscale" which is different from the default "audacity" color map.
        const firstSpectrogram = fixture.spectrogramComponent(testedSpectrogramIndex);
        await expect(firstSpectrogram).toHaveAttribute("color-map", "grayscale");

        // Change the spectrograms media control color map option to a
        // non-default and non-template value ("green").
        await fixture.openSettingsMenu(testedSpectrogramIndex);
        const initialOptions = await fixture.spectrogramOptions(testedSpectrogramIndex);
        expect(initialOptions.colorMap).toEqual("grayscale");

        const colorMapMenu = fixture.colorMapMenu(testedSpectrogramIndex);
        await colorMapMenu.click();

        await colorMapMenu.getByText("Green").click();

        // We re-use the same spectrogram locator reference because we expect
        // that the spectrogram element is not destroyed / re-created when the
        // color map changes.
        // If this assertion is failing to find the locator, it is likely that
        // the spectrogram element is being incorrectly re-created.
        const updatedOptions = await fixture.spectrogramOptions(testedSpectrogramIndex);
        expect(updatedOptions.colorMap).toEqual("green");

        // Because the attributes are a part of the "custom template options",
        // they should not be modified when the settings are updated through the
        // media controls.
        await expect(firstSpectrogram).toHaveAttribute("color-map", "grayscale");

        // We can trigger an auto-page by making a decision without any
        // sub-selection, causing every tile to have the decision applied to it.
        //
        // Because we want to wait for the auto-page to complete, we wait for
        // the next page of subjects to have their spectrograms fully load and
        // emit the "loaded" event.
        const gridLoadedEvent = catchLocatorEvent(fixture.gridComponent(), "grid-loaded");
        await fixture.makeVerificationDecision("true");
        await gridLoadedEvent;

        // After paging, we should see that the media control changes have been
        // reverted and that the spectrogram custom template options are still
        // unchanged.
        const afterPagingOptions = await fixture.spectrogramOptions(testedSpectrogramIndex);
        expect(afterPagingOptions.colorMap).toEqual("grayscale");
        await expect(firstSpectrogram).toHaveAttribute("color-map", "grayscale");

        // Because the spectrograms options have changed, we expect that the
        // media controls "selected" color map is correctly reset back to the
        // template value.
        await fixture.openSettingsMenu(testedSpectrogramIndex);

        const updatedColorMapMenu = fixture.colorMapMenu(testedSpectrogramIndex);
        await updatedColorMapMenu.click();

        await expect(updatedColorMapMenu.getByText("Grayscale")).toHaveAttribute("aria-checked", "true");
      });

      test.fixme("should not enter history if resized before auto paging completes", async ({ fixture }) => {
        await fixture.changeGridSize(4);

        // This is flaky because it depends on the makeVerificationDecision and
        // changeGridSize completing before the autoPageTimeout (300ms).
        //
        // TODO: We should mock the autoPageTimeout to make this test more
        // reliable.
        await fixture.makeVerificationDecision("true");
        await fixture.changeGridSize(2);

        expect(await fixture.isViewingHistory()).toBe(false);
        const viewHead = await fixture.getViewHead();
        const decisionHead = await fixture.getVerificationHead();
        expect(viewHead).toBe(decisionHead);
      });
    });
  });
});

test.describe("small datasets", () => {
  const datasetSize = 3;

  test.beforeEach(async ({ fixture }) => {
    await fixture.create(undefined, undefined, fixture.smallJsonInput);
  });

  test("should have a placeholder tile for small datasets", async ({ fixture }) => {
    const testedGridSize = 4;
    const expectedPlaceholderCount = testedGridSize - datasetSize;

    await fixture.changeGridSize(testedGridSize);

    await expect(fixture.gridTileContainers()).toHaveCount(datasetSize);
    await expect(fixture.gridTilePlaceholders()).toHaveCount(expectedPlaceholderCount);
  });

  test("should not have any placeholders if the grid size is large enough", async ({ fixture }) => {
    await fixture.changeGridSize(2);
    await expect(fixture.gridTilePlaceholders()).toHaveCount(0);
  });
});
