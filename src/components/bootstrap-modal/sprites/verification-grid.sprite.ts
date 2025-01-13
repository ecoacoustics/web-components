import { svg, SVGTemplateResult } from "lit";
import { gridTileSprite } from "./grid-tile.sprite";
import { FixedLengthArray } from "../../../helpers/types/advancedTypes";
import { Pixel } from "../../../models/unitConverters";
import { range } from "lit/directives/range.js";
import { map } from "lit/directives/map.js";

export type TempAnimalPresenceArray = FixedLengthArray<boolean, 6>;

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

export function verificationGridPageSpriteArray(
  hasClassification = false,
  hasAnimal: TempAnimalPresenceArray,
): SVGTemplateResult {
  // Although using pixel values here seems like a bad hacky idea, it is not too
  // bad since we are using the pixel values inside an SVG viewBox.
  // This means that the pixel values will dynamically react to screen size
  // changes as the svg viewBox changes
  const gridTileSize: Pixel = 80;
  const gridTileHeight: Pixel = 50;
  const gridTileGap: Pixel = 20;

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
      ${map(range(0, gridTileCount), (i: number) => {
        const { x, y } = gridTilePosition(i);
        const hasAnimalValue = hasAnimal[i];
        return gridTileSprite(x, y, hasClassification, hasAnimalValue, `grid-tile tile-${i}`);
      })}
    </g>
  `;
}
