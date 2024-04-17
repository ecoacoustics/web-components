import { fullFixture as test } from "./full.fixture";

test.describe("interactions between all components", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("playing audio", async ({ fixture }) => {
    await fixture.playAudio();
  });

  test("pausing audio", async ({ fixture, page }) => {
    await fixture.playAudio();
    await page.waitForTimeout(500);
    await fixture.pauseAudio();
  });

  test("restarting audio", async ({ fixture, page }) => {
    await fixture.playAudio();
    await page.waitForTimeout(500);
    await fixture.pauseAudio();
    await page.waitForTimeout(500);
    await fixture.playAudio();
  });
});

// in these tests, the initial page doesn't have all the components
// this means that all the components firstUpdated() function doesn't run at the same time
// if you are relying on connecting components through firstUpdated(), these
// tests will fail
test.describe("progressively adding components", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });
});

test.describe("removing components", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("removing the spectrogram component", async ({ fixture }) => {});

  test("removing components while audio is playing", async ({ fixture }) => {
    await fixture.playAudio();
  });
});

test.describe("changing components", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("changing spectrogram element", async ({ fixture }) => {});

  test("adding multiple spectrogram elements", async ({ fixture }) => {});
});

// the elements should work together correctly, but most functionality should
// be disabled or unavailable
test.describe("components with no audio source", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });
});
