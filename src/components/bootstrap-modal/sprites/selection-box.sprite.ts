import { svg } from "lit";
import { SvgSprite } from "./types";

export function selectionBoxSprite(): SvgSprite {
  return svg`
    <rect
      class="highlight-box"
      x="30"
      y="22"
      width="0"
      height="0"
      opacity="0.3"
      stroke-width="1"
      rx="var(--oe-border-rounding)"
      stroke="var(--oe-border-color)"
      fill="var(--oe-selected-color)"
    />
  `;
}
