import { css } from "lit";

export const axesStyles = css`
  li {
    list-style-type: none;
  }

  #wrapped-element {
    display: inline-block;
    margin: 2rem;
  }

  #wrapped-element > svg {
    position: absolute;
    z-index: 1;
    overflow: visible;
  }
`;
