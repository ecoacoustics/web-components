import { verificationGridTileFixture as test } from "./verification-grid-tile.fixture";
import { setBrowserValue } from "../../tests/helpers";

test.describe("verification grid tile", () => {
  test("should use a cursor pointer if it is not the only grid tile", async ({ fixture }) => {
    await fixture.create();
    await setBrowserValue(fixture.component(), "isOnlyTile", false);
    await fixture.assertCursor("pointer");
  });

  test("should use a normal cursor if it is the only grid tile", async ({ fixture }) => {
    await fixture.create();
    await setBrowserValue(fixture.component(), "isOnlyTile", true);
    await fixture.assertCursor("auto");
  });
});
