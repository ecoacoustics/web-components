import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { svg } from "lit";
import { verificationGridSprite } from "../sprites/verification-grid.sprite";
import gridTileSprite from "../sprites/grid-tile.svg?raw";
import cursorSprite from "../sprites/cursor.svg?raw";
import selectionBoxSprite from "../sprites/selection-box.svg?raw";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return svg`
      <g class="selection-slide">
        ${importSprites(gridTileSprite, cursorSprite, selectionBoxSprite)}

        ${verificationGridSprite()}

        <use href="#cursor" class="selection-cursor" x="225" y="100" />
        <use
          href="#selection-box"
          x="25"
          y="20"
        />
      </g>
    `;
  }
}
