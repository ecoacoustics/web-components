import { svg } from "lit";
import { SvgSprite } from "../../../helpers/animations/sprites";
import { Pixel } from "../../../models/unitConverters";
import { Ref } from "lit/directives/ref.js";
import { when } from "lit/directives/when.js";

export interface GridTileSpriteRefs {
  background?: Ref<SVGRectElement>;
  decisionMeter?: Ref<SVGRectElement>;
}

export function gridTileSprite(
  x: Pixel,
  y: Pixel,
  hasClassification = false,
  hasAnimal: boolean,
  classNames?: string,
): SvgSprite {
  const tagName = hasAnimal ? "Kookaburra" : "Car";

  return svg`
    <svg
      viewBox="0 0 80 60"
      width="80"
      height="60"
      class="grid-tile ${classNames}"
      x="${x}"
      y="${y}"
    >
      <rect
        class="grid-tile-background"
        width="80"
        height="60"
        rx="5"
        stroke-width="2"
        fill="var(--oe-panel-color)"
      />

      <rect
        x="10"
        y="15"
        rx="2"
        width="60"
        height="30"
        fill="#ccc"
      />

      ${when(!hasClassification, () => svg`<text x="7" y="12" font-size="6">${tagName}</text>`)}
      ${hasClassification ? gridProgressClassification(hasAnimal) : gridProgressVerification(hasAnimal)}
    </svg>
  `;
}

function gridProgressVerification(hasAnimal: boolean): SvgSprite {
  return svg`
    <rect
      x="10"
      y="50"
      width="60"
      height="4"
      rx="2"
      stroke-width="0.5"
      fill="var(--decision-color)"
      stroke="var(--oe-border-color)"
      class="decision-meter"
    />
  `;
}

function gridProgressClassification(hasAnimal: boolean): SvgSprite {
  return svg`
    <rect
      x="10"
      y="50"
      width="60"
      height="4"
      rx="2"
      stroke-width="0.5"
      fill="var(--decision-color)"
      stroke="var(--oe-border-color)"
      class="decision-meter"
    />
  `;
}
