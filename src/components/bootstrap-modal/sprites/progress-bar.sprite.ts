import { svg } from "lit";
import { SvgSprite } from "../../../helpers/animations/sprites";
import { Pixel } from "../../../models/unitConverters";

export function progressBarSprite(x: Pixel, y: Pixel): SvgSprite {
  // css variables:
  //   --progress
  //     A value that represents the progress of the progress bar.
  //     Example: 10px
  //     Default: 0px
  return svg`
    <svg>
      <style>
        :host {
          --chevron-previous-color: var(--oe-primary-color);
          --chevron-next-color: var(--oe-primary-color);
        }
      </style>

      <svg viewBox="0 0 220 10" class="progress-bar" x="${x}" y="${y}">
        <path
          d="M 10 0 L 5 2.5 L 10 5"
          stroke="var(--chevron-previous-color)"
          fill="transparent"
        />
        <path
          d="M 20 0 L 25 2.5 L 20 5"
          stroke="var(--chevron-next-color)"
          fill="transparent"
        />

        <rect
          x="40"
          width="170"
          height="5"
          rx="5"
          fill="var(--oe-panel-color)"
        />
        <rect
          class="verification-head-segment"
          x="40"
          height="5"
          rx="5"
          fill="var(--oe-selected-color)"
        />
        <rect
          class="view-head-segment"
          x="40"
          height="5"
          rx="5"
          fill="var(--oe-secondary-color)"
        />
      </svg>
    </svg>
  `;
}
