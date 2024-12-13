import { svg } from "lit";
import { SvgSprite } from "./types";
import { Pixel, Seconds } from "../../../models/unitConverters";
import { createRef, ref, Ref } from "lit/directives/ref.js";

export function cursorSprite(className: string, x: Pixel, y: Pixel, clicks?: Seconds[]): SvgSprite {
  const clickAnimationRef: Ref<SVGGElement> = createRef();

  const template = svg`
    <svg class="${className}" x="${x}" y="${y}">
      <!--
        The click animation consists of two circles that grow an shrink to give
        a ripple effect when the cursor is clicked.
      -->
      <g class="click-animation" ${ref(clickAnimationRef)}>
        <defs>
          <radialGradient id="leading-ping">
            <stop offset="10%" stop-color="pink" />
            <stop offset="50%" stop-color="red" />
          </radialGradient>

          <radialGradient id="trailing-ping">
            <stop offset="10%" stop-color="lightpink" />
            <stop offset="50%" stop-color="pink" />
          </radialGradient>
        </defs>

        <circle
          cx="8"
          cy="6"
          fill="url(#leading-ping)"
          opacity="0.5"
        >
          <animate
            attributeName="r"
            values="0;6;0"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </circle>

        <circle
          cx="8"
          cy="6"
          fill="url(#trailing-ping)"
          opacity="0.5"
        >
          <animate
            attributeName="r"
            values="0;7;0"
            dur="1s"
            repeatCount="indefinite" />
        </circle>
      </g>

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

  const animationElement = clickAnimationRef.value;
  if (animationElement && clicks && clicks.length > 0) {
    animationElement.animate([{ r: "0" }, { r: "6" }, { r: "0" }], {
      duration: 500,
      iterations: Infinity,
    });
  }

  return template;
}
