import { css } from "lit";

export const verificationGridTileStyles = css`
  :host {
    --secondary-color: black;
  }

  .tile-container {
    margin: 2px;
  }

  .selected {
    border: 2px solid var(--secondary-color);
    filter: opacity(0.8);
    border-radius: 8px;
    margin: 0;
  }
`;
