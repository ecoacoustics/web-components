import { css } from "lit";

export const verificationGridTileStyles = css`
  :host {
    --secondary-color: black;
    --selection-width: 6px;
  }

  .tile-container {
    margin: var(--selection-width);
  }

  .selected {
    border: var(--selection-width) solid var(--secondary-color);
    background-color: var(--secondary-color);
    border-radius: 8px;
    margin: 0;
  }
`;
