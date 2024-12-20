import { svg } from "lit";
import { SvgSprite } from "../../../helpers/animations/sprites";

export function selectionBoxSprite(): SvgSprite {
  // Chrome doesn't like it if we use the var(--oe-border-rounding) theming
  // variable here, therefore, I have hard-coded the rx value to 2.
  return svg`
    <rect
      class="highlight-box"
      x="30"
      y="22"
      width="0"
      height="0"
      opacity="0.3"
      stroke-width="1"
      rx="2"
      stroke="var(--oe-border-color)"
      fill="var(--oe-selected-color)"
    />
  `;
}
