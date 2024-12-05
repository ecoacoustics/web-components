import { importSprites } from "../../../helpers/svgs/imports";
import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import { verificationGridSprite } from "./sprites/verification-grid.sprite";
import gridTile from "./sprites/grid-tile.svg?raw";
import cursorSprite from "./sprites/cursor.svg?raw";

export class SelectionSlide extends AbstractSlide {
  public constructor() {
    super("You can decide about more than one subject at once");
  }

  public render() {
    return svg`
      ${importSprites(gridTile, cursorSprite)}

      ${verificationGridSprite()}

      <use href="#cursor" x="65" y="120" />
    `;
  }
}
