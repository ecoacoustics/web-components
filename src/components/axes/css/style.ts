import { css } from "lit";

export const axesStyles = css`
  :host {
    position: relative;
    display: inline-block !important;
    width: 100%;
  }

  #wrapped-element {
    position: relative;
  }

  svg {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: visible;

    line {
      shape-rendering: crispEdges;
    }

    text {
      stroke: none;
    }

    g {
      stroke: currentColor;
    }
  }

  .grid-line {
  }

  /*
    I style these with css parts so that if the user uses css parts
    These styles will be overwritten
  */
  ::part(grid) {
    color: lightblue;
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }

  ::part(tick) {
    color: black;
  }
`;
