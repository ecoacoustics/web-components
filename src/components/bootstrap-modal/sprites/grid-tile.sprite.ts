import { svg } from "lit";
import { SvgSprite } from "./types";
import { Pixel } from "../../../models/unitConverters";

export function gridTileSprite(x: Pixel, y: Pixel): SvgSprite {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}">
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

      <text x="7" y="12" font-size="6">Tag Name</text>

      <rect
        x="10"
        y="50"
        width="60"
        height="4"
        rx="2"
        stroke-width="0.5"
        fill="var(--decision-color)"
        stroke="var(--oe-border-color)"
      />
    </svg>
  `;
}
