import { expect } from "../../tests/assertions";
import { SpectrogramComponent } from "../spectrogram/spectrogram";
import { MediaControlsComponent } from "./media-controls";
import { mediaControlsFixture as test } from "./media-controls.fixture";

test.describe("audio element communication", () => {
  function elementCommunicationTests() {
    test("should correctly attach a spectrogram component", async ({ fixture }) => {
      // We use "evaluate" here because we want to compare browser object
      // references which cannot be reliably passed across the nodejs/browser
      // Playwright boundary.
      const hasEqualReference = await fixture.component().evaluate((mediaControls: MediaControlsComponent) => {
        // I have to use the bracket property access notation because
        // spectrogramElement is a private field.
        const internalRef = mediaControls["spectrogramElement"];

        // This type cast here is ok because we are just removing the "null"
        // typing because we know that the spectrogram exists in the fixture.
        const spectrogramRef = document.querySelector("oe-spectrogram") as SpectrogramComponent;

        return internalRef === spectrogramRef;
      });

      expect(hasEqualReference).toEqual(true);
    });

    // this test exists because if you don't correctly import or mount the media controls component
    // it will still create the element tag, but with no shadow content or error indicating that mounting
    // the component failed and will make all other tests fail because no content = a "hidden" state
    // therefore, by having a mounting smoke test, we can ensure that this test will fail only if
    // we have mounted the component incorrectly
    test("creating a visible web component", async ({ fixture }) => {
      const mediaControls = fixture.page.locator("oe-media-controls");
      await expect(mediaControls).toBeVisible();
    });

    test("state before interaction", async ({ fixture }) => {
      const isPlaying = await fixture.isPlayingAudio();
      expect(isPlaying).toBe(false);
    });

    test("play functionality", async ({ fixture }) => {
      await fixture.toggleAudio();
      const isPlaying = await fixture.isPlayingAudio();
      expect(isPlaying).toBe(true);
    });

    test("play pause functionality", async ({ fixture }) => {
      // start playing audio
      // by clicking the action button again, we should stop playing audio
      await fixture.toggleAudio();
      await fixture.toggleAudio();

      const isPlaying = await fixture.isPlayingAudio();

      expect(isPlaying).toBe(false);
    });
  }

  test.describe("using spectrogram id", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithId();
    });

    elementCommunicationTests();
  });

  test.describe("using element reference", () => {
    test.beforeEach(async ({ fixture }) => {
      await fixture.createWithRef();
    });

    elementCommunicationTests();
  });

  test("should reflect attribute if changing from spectrogram reference to element id", async ({ fixture }) => {
    await fixture.createWithId();
    await fixture.setForElementId();
    await expect(fixture.component()).toHaveAttribute("for", fixture.spectrogramId);
  });

  test("should reflect attribute if changing from for attribute to element reference", async ({ fixture }) => {
    await fixture.createWithRef();
    await fixture.setForElementReference();
    await expect(fixture.component()).toHaveAttribute("for", "[object HTMLElement]");
  });
});

test.describe("changing options", () => {
  test.skip("should change the spectrogram colours through the media controls should change the grid tile", () => {});

  test.skip("should change the spectrograms axes through the media controls should change the grid tile", () => {});

  test.skip("should remove spectrogram modifications when changing to the next page", () => {});

  test.skip("should show what options are currently selected in the media controls", () => {});
});

test.describe("slots", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithId();
  });

  test("custom play and pause icon via slots", async ({ fixture }) => {
    await fixture.updateSlot(`
      <div slot="play-icon">Play Me!</div>
      <div slot="pause-icon">Pause<div>
    `);

    const expectedSlotText = ["Play Me!"];
    const realSlotText = await fixture.actionButtonSlotText();
    expect(realSlotText).toEqual(expectedSlotText);

    // start playing audio so we can see the default pause icon
    await fixture.toggleAudio();

    const expectedPauseSlotText = ["Pause"];
    const realPauseSlotText = await fixture.actionButtonSlotText();
    expect(realPauseSlotText.map((x) => x?.trim())).toEqual(expectedPauseSlotText);
  });
});

test.describe("css parts", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.createWithId();
  });

  const cssPartsStyling = `
    oe-media-controls::part(play-icon) {
      color: rgb(255, 0, 0);
      background-color: rgb(0, 0, 255);
    }

    oe-media-controls::part(pause-icon) {
      color: rgb(0, 255, 0);
      background-color: rgb(255, 255, 0);
    }
  `;

  test.beforeEach(async ({ fixture }) => {
    await fixture.page.addStyleTag({ content: cssPartsStyling });
  });

  test("custom styling for the default play/pause icons via css parts", async ({ fixture }) => {
    const playButtonStyles = await fixture.actionButtonStyles();
    expect(playButtonStyles).toEqual({
      color: "rgb(255, 0, 0)",
      backgroundColor: "rgb(0, 0, 255)",
    });

    await fixture.toggleAudio();

    const pauseButtonStyles = await fixture.actionButtonStyles();
    expect(pauseButtonStyles).toEqual({
      color: "rgb(0, 255, 0)",
      backgroundColor: "rgb(255, 255, 0)",
    });
  });

  test("custom styling for a custom play/pause slot via css parts", async ({ fixture }) => {
    const playButtonStyles = await fixture.actionButtonStyles();
    expect(playButtonStyles).toEqual({
      color: "rgb(255, 0, 0)",
      backgroundColor: "rgb(0, 0, 255)",
    });

    await fixture.toggleAudio();

    const pauseButtonStyles = await fixture.actionButtonStyles();
    expect(pauseButtonStyles).toEqual({
      color: "rgb(0, 255, 0)",
      backgroundColor: "rgb(255, 255, 0)",
    });
  });
});
