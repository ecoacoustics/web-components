import { svg } from "lit";
import { SvgSprite } from "./types";
import { Pixel } from "../../../models/unitConverters";

export function cursorSprite(x: Pixel, y: Pixel): SvgSprite {
  // the view box of this svg is 21x26, reflecting the total size of the cursor
  return svg`
    <svg
      viewBox="0 0 26 31"
      class="cursor"
      x="${x}"
      y="${y}"
      width="21"
      height="26"
    >
      <defs>
        <radialGradient id="click-gradient">
          <stop offset="0%" stop-color="red" />
          <stop offset="100%" stop-color="pink" />
        </radialGradient>
      </defs>

      <circle
        class="click-animation"
        cx="8"
        cy="6"
        fill="url(#click-gradient)"
        opacity="0.5"
      ></circle>

      <path class="pointer" d="
        M 8 6
        L 12 23
        L 15 20.5

        L 20.5 28
        L 25 25
        L 19 18

        L 22.5 15.5
        z" fill="white" stroke="black" stroke-width="1"
      />
    <svg>
  `;
}
