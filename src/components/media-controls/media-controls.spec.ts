import { expect } from "../../tests/assertions";
import { mediaControlsFixture as test } from "./media-controls.fixture";

test.describe("audio element communication", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  // this test exists because if you don't correctly import or mount the media controls component
  // it will still create the element tag, but with no shadow content or error indicating that mounting
  // the component failed and will make all other tests fail because no content = a "hidden" state
  // therefore, by having a mounting smoke test, we can ensure that this test will fail only if
  // we have mounted the component incorrectly
  test("creating a visible web component", async ({ page }) => {
    const mediaControls = await page.locator("oe-media-controls");
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
});

test.describe("changing options", () => {
  test.skip("should change the spectrogram colours through the media controls should change the grid tile", () => {});

  test.skip("should change the spectrograms axes through the media controls should change the grid tile", () => {});

  test.skip("should remove spectrogram modifications when changing to the next page", () => {});

  test.skip("should show what options are currently selected in the media controls", () => {});
});

test.describe("slots", () => {
  test("custom play and pause icon via slots", async ({ fixture }) => {
    fixture.updateSlot(`
      <div slot="play-icon">Play Me!</div>
      <div slot="pause-icon">Pause<div>
    `);

    const expectedSlotText = ["Play Me!"];
    const realSlotText = await fixture.actionButtonSlotText();
    await expect(realSlotText).toEqual(expectedSlotText);

    // start playing audio so we can see the default pause icon
    await fixture.toggleAudio();

    const expectedPauseSlotText = ["Pause"];
    const realPauseSlotText = await fixture.actionButtonSlotText();
    await expect(realPauseSlotText.map((x) => x?.trim())).toEqual(expectedPauseSlotText);
  });
});

test.describe("css parts", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
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

  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({ content: cssPartsStyling });
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
