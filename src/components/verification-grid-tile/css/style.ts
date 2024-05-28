import { css } from "lit";

export const verificationGridTileStyles = css`
  :host {
    --secondary-color: rgba(0, 0, 0, 0.7);
    --selection-width: 2px;
    --background-color: #f8f2f6;
  }

  .tile-container {
    border-radius: 12px;
    border: solid 1px rgba(0, 0, 0, 0.2);
    background-color: var(--background-color);
    box-shadow: 0 2px 4px var(--background-color);
    padding: 1rem;
    cursor: pointer;
    margin: calc(0.5rem + var(--selection-width));

    &:hover {
      box-shadow: 0 2px 4px #e8e2e6;
    }
  }

  .selected {
    border: var(--selection-width) solid var(--secondary-color);
    margin: calc(0.5rem + 1px);
  }
`;
