import { css } from "lit";

export const verificationGridTileStyles = css`
  :host {
    --selected-border-size: 3px;
  }

  .tile-container {
    --decision-color: var(--oe-panel-color);

    position: relative;
    border-radius: var(--oe-border-rounding);
    background-color: var(--oe-panel-color);
    box-shadow: 4px 4px 8px var(--oe-panel-color);
    padding: var(--oe-spacing);
    cursor: pointer;
    margin: var(--oe-spacing);
    margin-bottom: 0;
    min-width: 350px;

    border: var(--selected-border-size) solid var(--decision-color);
    transition: border-color var(--oe-animation-time) ease-out;

    &:hover {
      box-shadow: 0 2px 4px #e8e2e6;
    }
  }

  /* TODO: maybe add a border here */
  .selected {
    background-color: var(--oe-selected-color);
  }

  .keyboard-hint {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(0%, calc(-50% - 1rem));
    z-index: 2;
    font-size: 2rem;
  }

  .overlay-text {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    font-size: 4em;

    background-color: var(--oe-panel-color);
    border-radius: var(--oe-border-rounding);
  }

  ::slotted(oe-media-controls) {
    display: flex;
    justify-content: center;
  }

  @media (max-width: 600px) {
    .tile-container {
      width: 100%;
      max-width: 93vw;
      margin: 0;
    }

    ::slotted(oe-spectrogram, oe-axes, oe-indicator) {
      position: relative;
      height: 460px;
    }
  }
`;
