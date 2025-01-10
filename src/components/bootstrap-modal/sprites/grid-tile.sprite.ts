import { svg } from "lit";
import { SvgSprite } from "../../../helpers/animations/sprites";
import { Pixel } from "../../../models/unitConverters";
import { when } from "lit/directives/when.js";
import whipbirdSpectrogramImage from "../../../static/xc_whipbird.png?inline";

export function gridTileSprite(
  x: Pixel,
  y: Pixel,
  isClassification = false,
  hasAnimal: boolean,
  classNames?: string,
): SvgSprite {
  const tagName = hasAnimal ? "Whipbird" : "Incorrect-Tag";

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

      ${when(!isClassification, () => svg`<text x="7" y="12" font-size="6">${tagName}</text>`)}

      <image
        x="10"
        y="15"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        href="${whipbirdSpectrogramImage}"
        decoding="async"
        style="width: 60px; height: 30px;"
      />

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
    </svg>
  `;
}
