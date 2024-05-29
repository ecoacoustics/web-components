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
      font-size: 0.8rem;
      stroke: darkgray;
      font-family: var(--oe-font-family);
      /* TODO: Find out why we have to do this */
      stroke-width: 0.5;
    }

    g {
      stroke: currentColor;
    }
  }

  .grid-line {
    color: lightblue;
    stroke-width: 1;
    opacity: 0.6;
  }
`;
