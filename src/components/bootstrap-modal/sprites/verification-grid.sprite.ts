import { svg, SVGTemplateResult } from "lit";

export function verificationGridSprite(): SVGTemplateResult {
  const gridTileSize = 80;
  const gridTileHeight = 50;
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

  return svg`
    <g class="grid-tiles">
      ${Array.from({ length: gridTileCount }).map((_, index) => {
        const position = gridTilePosition(index);
        return svg`<use class="tile-${index}" href="#grid-tile" x="${position.x}" y="${position.y}" />`;
      })}
    </g>
  `;
}
