import { svg } from "lit";
import { SvgSprite } from "./types";
import { Pixel } from "../../../models/unitConverters";

export function cursorSprite(x: Pixel, y: Pixel): SvgSprite {
  // the view box of this svg is 21x26, reflecting the total size of the cursor
  //
  // note: the Lit "svg" template is a template fragment, meaning that it does
  // not need a top-level <svg> element.
  // it will allow a top-level <svg> element (which we have used in other
  // templates), but that is only because it is valid for svg branches to have
  // inner <svg> elements.
  // as per the lit documentation, <svg> elements should not contain the
  // top-level <svg> element as it hurts rendering performance.
  // see: https://lit.dev/docs/api/templates/#svghttps://lit.dev/docs/api/templates/#svg
  //
  // I have added this <g> element as the svg fragments top-level element so
  // that we can animate the cursor on Chrome.
  // For some reason, Chrome does not allow transform animating nested <svg>
  // fragments
  return svg`
    <g class="cursor">
      <svg
        viewBox="0 0 26 31"
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
    </g>
  `;
}
