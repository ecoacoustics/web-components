import { importSprites } from "../../../helpers/svgs/imports";
import { AbstractSlide } from "./abstractSlide";
import { svg } from "lit";
import gridTile from "./sprites/grid-tile.svg?raw";
import decisionButtons from "./sprites/decision-buttons.svg?raw";
import progressBar from "./sprites/progress-bar.svg?raw";
import attentionCircle from "./sprites/attention-circle.svg?raw";

export class PagingSlide extends AbstractSlide {
  public constructor() {
    super("You can navigate through the pages using the arrows");
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
      ${importSprites(gridTile, decisionButtons, progressBar, attentionCircle)}

      ${gridTemplate}

      <use href="#decision-buttons" x="65" y="120" />
      <use href="#progress-bar" x="0" y="40" style="--progress: 90px" />

      <use href="#attention-circle" x="-30" y="0" style="--progress: 90px" />
    `;
  }
}
