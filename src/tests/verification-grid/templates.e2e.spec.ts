import { catchLocatorEvent } from "../helpers/helpers";
import { verificationGridFixture as test } from "./verification-grid.e2e.fixture";
import { expect, expectConsoleError } from "../assertions";

test.describe("slotted templates", () => {
  test.describe("information cards", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.create(
        `
        <oe-verification verified="true">Koala</oe-verification>
        <oe-verification verified="false">Not Koala</oe-verification>

        <template>
          <div class="tile-spacing">
            <oe-subject-tag></oe-subject-tag>
            <oe-media-controls for="spectrogram"></oe-media-controls>
          </div>

          <oe-axes>
            <oe-indicator>
              <oe-spectrogram id="spectrogram"></oe-spectrogram>
            </oe-indicator>
          </oe-axes>

          <div class="tile-block">
            <oe-task-meter></oe-task-meter>
            <oe-info-card></oe-info-card>
          </div>
        </template>
      `,
        ["oe-info-card"],
      );
    });

    test("should show the information about the current tile", async ({ fixture }) => {
      const expectedInfoCard = [
        { key: "Filename", value: "20220130T160000+1000_SEQP-Samford-Dry-B_643356.flac" },
        { key: "FileId", value: "643,356" },
        { key: "Datetime", value: "2022-01-30T06:00:00.000Z" },
      ] as const;

      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when paging", async ({ fixture }) => {
      await fixture.changeGridSize(3);

      const gridLoadedEvent = catchLocatorEvent(fixture.gridComponent(), "grid-loaded");
      await fixture.makeVerificationDecision("true");

      // because it can take a while for the next page to load, and the info
      // cards to update, we have to wait until we receive the "grid-loaded"
      // event that signals that the next page has been loaded
      await gridLoadedEvent;

      // These items are from the "test-items.json" dataset.
      // Because the grid size is 4, we expect that the first info card after
      // making a whole page decision will be about the 5th item in the
      // "test-items.json" dataset.
      const expectedInfoCard = [
        { key: "Filename", value: "20191022T140000+1000_SEQP-Samford-Dry-B_251486.flac" },
        { key: "FileId", value: "251,486" },
        { key: "Datetime", value: "2019-10-22T04:00:00.000Z" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when viewing history", async ({ fixture }) => {
      const gridLoadedEvent = catchLocatorEvent(fixture.gridComponent(), "grid-loaded");
      await fixture.makeVerificationDecision("true");
      await gridLoadedEvent;

      await fixture.viewPreviousHistoryPage();

      const expectedInfoCard = [
        { key: "Filename", value: "20220130T160000+1000_SEQP-Samford-Dry-B_643356.flac" },
        { key: "FileId", value: "643,356" },
        { key: "Datetime", value: "2022-01-30T06:00:00.000Z" },
      ];
      const realizedInfoCard = await fixture.infoCardItem(0);
      expect(realizedInfoCard).toEqual(expectedInfoCard);
    });

    test("should update correctly when changing the grid source", async ({ fixture }) => {
      const expectedInitialInfoCard = [
        { key: "Filename", value: "20220130T160000+1000_SEQP-Samford-Dry-B_643356.flac" },
        { key: "FileId", value: "643,356" },
        { key: "Datetime", value: "2022-01-30T06:00:00.000Z" },
      ];
      const expectedNewInfoCard = [
        { key: "AudioLink", value: "http…example2.flac" },
        { key: "Distance", value: "4.846" },
        { key: "Tags", value: "koala" },
      ];

      const realizedInitialInfoCard = await fixture.infoCardItem(0);
      expect(realizedInitialInfoCard).toEqual(expectedInitialInfoCard);

      await fixture.changeGridSource(fixture.secondJsonInput);
      const realizedNewInfoCard = await fixture.infoCardItem(0);
      expect(realizedNewInfoCard).toEqual(expectedNewInfoCard);
    });
  });

  test.describe("invalid templates", () => {
    test("should error when missing required elements", { tag: [expectConsoleError] }, async ({ fixture }) => {
      // TODO: For some reason, Safari renders tiles for invalid templates
      test.skip(!!process.env.CI && process.platform === "darwin");

      // Even though the verification grid is missing both the oe-subject-tag
      // and the oe-task-meter elements, we only error for one of them at a
      // time.
      const expectedError = "The provided grid item template does not contain a subject tag component.";

      await expect(async () => {
        await fixture.createWithInvalidTemplate();
      }).toConsoleError(fixture.page, expectedError);
    });

    test("should not render tiles if the template is invalid", { tag: [expectConsoleError] }, async ({ fixture }) => {
      test.skip(!!process.env.CI && process.platform === "darwin");

      await fixture.createWithInvalidTemplate();
      await expect(fixture.gridTileComponents()).toHaveCount(0);
    });

    test("should have no no progress or 'continue verifying' button", async ({ fixture }) => {
      await expect(fixture.continueVerifyingButton()).toHaveCount(0);
    });
  });

  test.describe("custom tile templates", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithValidTemplate();
    });

    test("should use the template for each grid item", async ({ fixture }) => {
      const expectedElementCount = 3;
      await fixture.changeGridSize(expectedElementCount);

      await expect(fixture.moreInformationButtons().first()).toBeVisible();
      await expect(fixture.moreInformationButtons()).toHaveCount(expectedElementCount);

      await expect(fixture.spectrogramComponents().first()).toBeVisible();
      await expect(fixture.spectrogramComponents()).toHaveCount(expectedElementCount);
    });

    test("should set the spectrograms source correctly", async ({ fixture }) => {
      const gridSize = await fixture.getGridSize();

      const spectrograms = fixture.spectrogramComponents();
      await expect(spectrograms).toHaveCount(gridSize);

      await expect(spectrograms.nth(0)).toHaveAttribute("src", "http://localhost:3000/example.flac");
      await expect(spectrograms.nth(1)).toHaveAttribute("src", "http://localhost:3000/example_34s.flac");
      await expect(spectrograms.nth(2)).toHaveAttribute("src", "http://localhost:3000/example_1s.wav");
    });

    test.skip("should fall back to the default template if the custom template is removed", async ({ fixture }) => {
      await fixture.removeCustomTemplate();

      // We make assertions over the displayed spectrograms because changing the
      // template will cause the verification grid to update.
      // If we are incorrectly advancing, skipping tiles, or not updating the
      // grid tiles with the new template, we want this test to fail.
      const spectrograms = fixture.spectrogramComponents();
      await expect(spectrograms).toHaveCount(4);

      await expect(spectrograms.nth(0)).toHaveAttribute("src", "http://localhost:3000/example.flac");
      await expect(spectrograms.nth(1)).toHaveAttribute("src", "http://localhost:3000/example_34s.flac");
      await expect(spectrograms.nth(2)).toHaveAttribute("src", "http://localhost:3000/example_1s.wav");
      await expect(spectrograms.nth(3)).toHaveAttribute("src", "http://localhost:3000/example.flac");

      // The "more information" button is a part of the custom template, and
      // should not be present after reverting to the default template.
      // If the button is still present, we are probably not updating the
      // verification grid tiles "" property correctly.
      await expect(fixture.moreInformationButtons()).toHaveCount(0);
    });

    test.skip("should be able to change from a default template to a custom template", () => {});

    // This test tests fully replacing the "<template>" element with a new
    // one.
    // This is different from just updating the contents of the existing
    // template.
    //
    // When replacing the verification grid tile, we append the new template
    // before removing the old one to give the verification grid the hardest
    // chance of correctly updating.
    // If we instead removed the old template first, we would be updating from
    // a no-template state to a new template which is an easier change.
    test("should correctly update the tile template if it is replaced", async ({ fixture }) => {
      const gridSize = await fixture.getGridSize();

      const customTemplate = `
        <oe-subject-tag></oe-subject-tag>
        <oe-spectrogram id="spectrogram"></oe-spectrogram>
        <oe-task-meter></oe-task-meter>

        <a href="/about" data-testid="new-template-link">New Link</a>
      `;

      await fixture.addCustomTemplate(customTemplate);

      // We expect that the new template is not being used because the original
      // template will be the first one found.
      // Therefore, the "more information" button should still be present.
      await expect(fixture.moreInformationButtons()).toHaveCount(gridSize);

      await fixture.removeCustomTemplate();

      await expect(fixture.moreInformationButtons()).toHaveCount(0);

      const newTemplateLink = fixture.page.getByTestId("new-template-link");
      await expect(newTemplateLink.first()).toBeVisible();
      await expect(newTemplateLink).toHaveCount(gridSize);
    });

    // TODO: https://github.com/ecoacoustics/web-components/issues/521
    // In this test, we update an attribute on an existing template to stress
    // test the template updating logic.
    test.skip("should update the tile template if the template content changes", async ({ fixture }) => {
      await fixture.gridComponent().evaluate((element) => {
        const template = element.querySelector("template") as HTMLTemplateElement;
        const moreInformationButton = template.content.getElementById("more-information-button") as HTMLAnchorElement;

        // Notice that we are updating the textContent of the button in-place.
        moreInformationButton.textContent = "Updated Button Text";
      });

      // I use text in this assertion so that we can visually see that the
      // template was updated in the test screenshot.
      await expect(fixture.moreInformationButtons().first()).toHaveText("Updated Button Text");
    });

    // We should not be able to leak styling outside of the <template> element
    // and into the main document or other elements inside of the grid tile
    // component.
    test("should scope css styles to the template", async ({ fixture }) => {
      const customBackgroundColor = "rgb(0, 0, 255)";
      const customTextColor = "rgb(255, 0, 0)";

      const targetMoreInfoButton = fixture.moreInformationButtons().first();
      await expect(targetMoreInfoButton).toHaveCSS("background-color", customBackgroundColor);
      await expect(targetMoreInfoButton).toHaveCSS("color", customTextColor);

      await expect(fixture.unscopedButton()).not.toHaveCSS("background-color", customBackgroundColor);
      await expect(fixture.unscopedButton()).not.toHaveCSS("color", customTextColor);
    });

    test.describe("interactive elements", () => {
      test("should not select if clicking a link with a href", async ({ fixture }) => {
        const target = fixture.page.getByTestId("link-with-href").first();
        await target.click();

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(0);
      });

      test("should select if clicking a link without a href", async ({ fixture }) => {
        const target = fixture.page.getByTestId("link-without-href").first();
        await target.click();

        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(1);
      });

      test("should not select if clicking a button with a click event listener", async ({ fixture }) => {
        // The play button on the media controls would usually select the
        // verification grid tile if clicked, however, because of our
        // addEventListener patch, we can detect that the play button handled
        // the click event and therefore not select the tile.
        await fixture.playSpectrogram(0);
        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(0);
      });

      test("should select if clicking a button without a click event listener", async ({ fixture }) => {
        const target = fixture.moreInformationButtons().first();
        await target.click();

        // Because the button does not have a click event listener, the click
        // event should be passed through to the verification grid tile and
        // cause the tile to be selected.
        const selectedTiles = await fixture.selectedTileIndexes();
        expect(selectedTiles).toHaveLength(1);
      });
    });
  });
});

test.describe("default templates", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should place decision elements in the correct location", async ({ fixture }) => {
    const affirmativeDecision = fixture.verificationButton("true");
    const negativeDecision = fixture.verificationButton("false");

    await expect(affirmativeDecision).toBeVisible();
    await expect(negativeDecision).toBeVisible();
    await expect(affirmativeDecision).toContainText("True");
    await expect(negativeDecision).toContainText("False");

    // The decision elements are slotted into the shadow DOM decisions
    // container, so we assert their location using their bounding boxes.
    const decisionsContainerBox = await fixture.footerControls().locator("#decisions-container").boundingBox();
    expect(decisionsContainerBox).not.toBeNull();

    for (const decision of [affirmativeDecision, negativeDecision]) {
      const decisionBox = await decision.boundingBox();
      expect(decisionBox).not.toBeNull();

      if (decisionsContainerBox && decisionBox) {
        expect(decisionBox.x).toBeGreaterThanOrEqual(decisionsContainerBox.x);
        expect(decisionBox.y).toBeGreaterThanOrEqual(decisionsContainerBox.y);
        expect(decisionBox.x + decisionBox.width).toBeLessThanOrEqual(
          decisionsContainerBox.x + decisionsContainerBox.width,
        );
        expect(decisionBox.y + decisionBox.height).toBeLessThanOrEqual(
          decisionsContainerBox.y + decisionsContainerBox.height,
        );
      }
    }
  });

  test("should have the expected elements", async ({ fixture }) => {
    const gridSize = await fixture.getGridSize();

    const expectedComponents = [
      fixture.tagTemplateComponents(),
      fixture.mediaControlsComponents(),

      fixture.axesComponents(),
      fixture.indicatorComponents(),
      fixture.spectrogramComponents(),

      fixture.taskMeterComponents(),
    ];

    for (const component of expectedComponents) {
      await expect(component.first()).toBeVisible();
      await expect(component).toHaveCount(gridSize);
    }
  });

  // After the verification grid has been fully initialized, we add a custom
  // template.
  test("should be able to change to a custom template", async ({ fixture }) => {
    const gridSize = await fixture.getGridSize();

    const customTemplate = `
        <oe-subject-tag></oe-subject-tag>
        <oe-spectrogram id="spectrogram"></oe-spectrogram>
        <oe-task-meter></oe-task-meter>

        <a href="/about" data-testid="new-template-link">New Link</a>
      `;

    await fixture.addCustomTemplate(customTemplate);

    const newTemplateLink = fixture.page.getByTestId("new-template-link");

    await expect(newTemplateLink.first()).toBeVisible();
    await expect(newTemplateLink).toHaveCount(gridSize);
  });
});
