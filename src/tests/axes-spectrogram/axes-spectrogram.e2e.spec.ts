import { axesSpectrogramFixture as customFixture } from "./axes-spectrogram.fixture";

customFixture.describe("interactions between axes and spectrogram", ({ fixture }) => {
  customFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });
});
