import { css } from "lit";

export const axesStyles = css`
  :host {
    position: relative;
    display: inline-block !important;
    width: 100%;
  }

  #wrapped-element {
    position: relative;
    padding-left: 3rem;
    padding-bottom: 1.5rem;
  }

  svg {
    position: absolute;
    /* width: 100%; */
    height: 100%;
    z-index: 1;
    overflow: visible;

    line {
      shape-rendering: crispEdges;
    }

    text {
      fill: var(--oe-font-color);
      stroke: none;
      font: 11px sans-serif;
    }

    g {
      stroke: currentColor;
    }
  }

  .grid-line {
    color: lightblue;
    stroke-width: 1;
    opacity: 0.4;
  }
`;
