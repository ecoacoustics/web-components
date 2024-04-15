import { css } from "lit";

export const axesStyles = css`
  li {
    list-style-type: none;
  }

  #wrapped-element {
    position: relative;
    display: inline-block;
    margin: 2rem;
  }

  #wrapped-element > svg {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1;
    overflow: visible;

    line {
      shape-rendering: crispEdges;
    }
  }

  #x-gridlines-g,
  #y-gridlines-g line {
    stroke: lightblue;
    opacity: 0.5;
  }

  #x-axis-g {
    transform: translateY(calc(100% - 4px));
  }
`;
