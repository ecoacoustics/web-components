import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import { importSprites } from "../../../helpers/svgs/imports";
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
    const gridTileSize = 50;
    const gridTileHeight = 40;
    const gridTileGap = 20;
    const gridTileRowCount = 4;
    const gridTileColumnCount = 2;
    const gridTileCount = gridTileRowCount * gridTileColumnCount;

    const gridTilePosition = (index: number) => {
      const x = index % gridTileRowCount;
      const y = Math.floor(index / gridTileRowCount);

      return {
        x: x * (gridTileSize + gridTileGap),
        y: y * (gridTileHeight + gridTileGap),
      };
    };

    const gridTemplate = svg`
      <g class="grid-tiles">
        ${Array.from({ length: gridTileCount }).map((_, index) => {
          const position = gridTilePosition(index);
          return svg`<use href="#grid-tile" x="${position.x}" y="${position.y}" />`;
        })}
      </g>
    `;

    return svg`
      ${importSprites(gridTile, decisionButtons)}

      ${gridTemplate}

      <use href="#decision-buttons" x="65" y="120" />
    `;
  }
}
