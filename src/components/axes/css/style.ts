import { css } from "lit";

export const axesStyles = css`
  :host {
    display: inline-block !important;
  }

  #wrapped-element {
    position: relative;
    display: inline-block;
    margin: 4rem;
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
    stroke-width: 1;
    stroke: currentColor;
    opacity: 0.6;
  }

  /*
    I style these with css parts so that if the user uses css parts
    These styles will be overwritten
  */
  ::part(grid) {
    color: lightblue;
    opacity: 0.6;
  }

  ::part(tick) {
    color: black;
  }
`;
