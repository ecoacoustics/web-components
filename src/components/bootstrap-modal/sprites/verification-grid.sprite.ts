import { svg, SVGTemplateResult } from "lit";
import { gridTileSprite } from "./grid-tile.sprite";

export function verificationGridPageSprite(hasClassification = false, hasAnimal = true): SVGTemplateResult {
  const gridTileSize = 80;
  const gridTileHeight = 50;
  const gridTileGap = 20;
  const gridTileRowCount = 3;
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

  return svg`
    <g class="grid-tiles">
      ${Array.from({ length: gridTileCount }).map((_, i) => {
        const { x, y } = gridTilePosition(i);
        return gridTileSprite(x, y, hasClassification, hasAnimal, `grid-tile tile-${i}`);
      })}
    </g>
  `;
}
