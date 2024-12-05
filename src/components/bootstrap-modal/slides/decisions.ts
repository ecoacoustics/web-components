import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import { importSprites } from "../../../helpers/svgs/imports";
import { verificationGridSprite } from "./sprites/verification-grid.sprite";
import decisionButtons from "./sprites/decision-buttons.svg?raw";
import gridTile from "./sprites/grid-tile.svg?raw";

export class DecisionsSlide extends AbstractSlide {
  public constructor(verificationTask: boolean, classificationTask: boolean) {
    let description = "";
    if (verificationTask && classificationTask) {
      description = "This verification grid contains both verification and classification tasks";
    } else if (verificationTask) {
      description = "This verification grid contains a verification task";
    } else if (classificationTask) {
      description = "This verification grid contains a classification task";
    }
    description = "This verification grid contains a verification task";

    super(description);
  }

  public render() {
    return svg`
      ${importSprites(gridTile, decisionButtons)}

      ${verificationGridSprite()}

      <use href="#decision-buttons" x="125" y="140" />
    `;
  }
}
