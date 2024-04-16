import { css } from "lit";

export const indicatorStyles = css`
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
    color: red;
    stroke: currentColor;
    stroke-width: 2;
    height: 100%;
    shape-rendering: crispEdges;
    /* Maybe not? Rendering on the GPU causes no lag, but a bit of sub-pixel rendering artifacts */
    will-change: transform;
  }
`;
