import { css } from "lit";

export const verificationGridTileStyles = css`
  .tile-container {
    border-radius: 12px;
    border: solid 1px var(--oe-secondary-background-color);
    background-color: var(--oe-panel-color);
    box-shadow: 4px 4px 8px var(--oe-panel-color);
    padding: 1rem;
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
    cursor: pointer;
    margin: calc(0.5rem + 2px);

    &:hover {
      box-shadow: 0 2px 4px #e8e2e6;
    }
  }

  .selected {
    border: 2px solid var(--oe-selected-color);
    background-color: var(--oe-selected-background-color);
  }
`;
