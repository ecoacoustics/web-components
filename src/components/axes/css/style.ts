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
      fill: var(--oe-text-color);
      stroke: none;
      font-family: var(--oe-font-family);
      font-size: 0.8rem;
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
