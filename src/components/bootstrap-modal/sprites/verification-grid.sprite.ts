import { svg, SVGTemplateResult } from "lit";
import { gridTileSprite } from "./grid-tile.sprite";
import { Tuple } from "../../../helpers/types/advancedTypes";
import { repeatCount } from "../../../helpers/directives";

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

export type TempAnimalPresenceArray = Tuple<boolean, 6>;

export function verificationGridPageSpriteArray(
  hasClassification = false,
  hasAnimal: TempAnimalPresenceArray,
): SVGTemplateResult {
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
      ${repeatCount(gridTileCount, (i: number) => {
        const { x, y } = gridTilePosition(i);
        const hasAnimalValue = hasAnimal[i];
        return gridTileSprite(x, y, hasClassification, hasAnimalValue, `grid-tile tile-${i}`);
      })}
    </g>
  `;
}
