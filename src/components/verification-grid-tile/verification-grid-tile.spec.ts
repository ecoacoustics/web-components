import { verificationGridTileFixture as test } from "./verification-grid-tile.fixture";
import { setBrowserValue } from "../../tests/helpers/helpers";
import { expect } from "../../tests/assertions";
import { VerificationGridTileComponent } from "./verification-grid-tile";

test.describe("verification grid tile", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("should use a cursor pointer if in multiple tile view mode", async ({ fixture }) => {
    await setBrowserValue<VerificationGridTileComponent>(fixture.component(), "singleTileViewMode", false);
    await expect(fixture.tileContainer()).toHaveCSS("cursor", "pointer");
  });

  test("should use a normal cursor if in single tile view mode", async ({ fixture }) => {
    await setBrowserValue<VerificationGridTileComponent>(fixture.component(), "singleTileViewMode", true);
    await expect(fixture.tileContainer()).toHaveCSS("cursor", "auto");
  });
});
