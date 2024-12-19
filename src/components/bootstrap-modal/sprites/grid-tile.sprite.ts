import { svg } from "lit";
import { SvgSprite } from "../../../helpers/animations/sprites";
import { Pixel } from "../../../models/unitConverters";
import { ref, Ref } from "lit/directives/ref.js";

export interface GridTileSpriteRefs {
  background?: Ref<SVGRectElement>;
  decisionMeter?: Ref<SVGRectElement>;
}

export function gridTileSprite(
  x: Pixel,
  y: Pixel,
  hasClassification = false,
  classNames?: string,
  refs?: GridTileSpriteRefs,
): SvgSprite {
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
        ${ref(refs?.background)}
      />

      <rect
        x="10"
        y="15"
        rx="2"
        width="60"
        height="30"
        fill="#ccc"
        ${ref(refs?.decisionMeter)}
      />

      <text x="7" y="12" font-size="6">Tag Name</text>
      ${hasClassification ? gridProgressClassification() : gridProgressVerification()}
    </svg>
  `;
}

function gridProgressVerification(): SvgSprite {
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

// TODO: we should show a classification task progress bar if the task is a
// classification task
function gridProgressClassification(): SvgSprite {
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
