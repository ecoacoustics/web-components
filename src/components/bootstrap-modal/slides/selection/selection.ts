import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html } from "lit";
import { verificationGridSprite } from "../../sprites/verification-grid.sprite";
import { selectionBoxSprite } from "../../sprites/selection-box.sprite";
import gridTileSprite from "../../sprites/grid-tile.svg?raw";
import cursorSprite from "../../sprites/cursor.svg?raw";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return html`
      <div class="selection-slide html-slide">
        <svg viewBox="0 0 390 230">
          ${importSprites(gridTileSprite, cursorSprite)} ${verificationGridSprite()}

          <use href="#cursor" class="selection-cursor" x="225" y="100" />
        </svg>

        ${selectionBoxSprite()}
      </div>
    `;
  }
}
