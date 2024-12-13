import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridPageSprite } from "../../sprites/verification-grid.sprite";
import { selectionBoxSprite } from "../../sprites/selection-box.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import gridTileSprite from "../../sprites/grid-tile.svg?raw";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return html`
      <div class="selection-slide html-slide">
        <svg viewBox="0 0 390 230">
          ${importSprites(gridTileSprite)}

          <g>${verificationGridPageSprite()}</g>

          ${cursorSprite(223, 96)}
        </svg>

        ${selectionBoxSprite()}
      </div>
    `;
  }
}
