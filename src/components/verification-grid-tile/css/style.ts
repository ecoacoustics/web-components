import { css } from "lit";

export const verificationGridTileStyles = css`
  .tile-container {
    position: relative;
    border-radius: var(--oe-border-rounding);
    border: solid 1px var(--oe-secondary-background-color);
    background-color: var(--oe-panel-color);
    box-shadow: 4px 4px 8px var(--oe-panel-color);
    padding: 1rem;
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
    cursor: pointer;
    margin: calc(0.5rem + 1px);

    &:hover {
      box-shadow: 0 2px 4px #e8e2e6;
    }
  }

  .selected {
    border: 2px solid var(--oe-selected-color);
    background-color: var(--oe-selected-background-color);
    margin: 0.5rem;
  }

  .keyboard-hint {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(0%, calc(-50% - 1rem));
    z-index: 2;
    font-size: 2rem;
  }
`;
