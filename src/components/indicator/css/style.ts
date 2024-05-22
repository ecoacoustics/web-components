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
    stroke-width: 2;
    display: inline-block !important;
  }

  #wrapped-element {
    position: relative;
    display: inline-block;

    & > * {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
      z-index: 1;
      overflow: visible;
    }
  }

  /* This element can be targeted through CSS parts */
  #indicator-line {
    stroke: currentColor;
    shape-rendering: crispEdges;
    will-change: transform;
  }
`;
