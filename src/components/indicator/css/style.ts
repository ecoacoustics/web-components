import { css } from "lit";

export const indicatorStyles = css`
  :host {
    /*
      By setting the color on the host element, it means that users can customize
      the color with plain css

      eg.
        oe-indicator { color: blue; } or <oe-indicator style="color: blue"></oe-indicator>
    */
    color: red;
  }

  #wrapped-element {
    position: relative;
    display: inline-block;
  }

  #wrapped-element > svg {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: visible;
  }

  /* This element can be targeted through CSS parts */
  #indicator-line {
    stroke: currentColor;
    stroke-width: 2;
    height: 100%;
    shape-rendering: crispEdges;
    will-change: transform;
  }
`;
