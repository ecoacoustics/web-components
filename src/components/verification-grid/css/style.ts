import { css } from "lit";

export const verificationGridStyles = css`
  #highlight-box {
    position: absolute;
    display: none;
    top: 0px;
    left: 0px;
    width: 0px;
    height: 0px;
    position: absolute;
    /* background-color: #00bbff; */
    background-color: #0099ee;
    border: solid 2px #002299;
    border-radius: 1rem;
    opacity: 0.3;
    z-index: 5;
  }

  #help-dialog {
    position: relative;
    min-width: 70%;
    min-height: 70%;
    background-color: var(--oe-panel-color);
    border: 3px solid var(--oe-selected-color);
    border-radius: var(--oe-border-rounding);
    padding: 0px;

    &::backdrop {
    }

    h2,
    h3 {
      font-weight: normal;
    }

    .dialog-container {
      position: relative;
      margin: 2rem;
    }

    .dialog-controls {
      display: block;
      position: relative;

      .close-btn {
        display: block;
        cursor: pointer;
      }

      .show-again {
      }
    }
  }

  .keyboard-shortcuts {
    display: grid;
    position: relative;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    width: 100%;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;

    .row {
      width: 100%;
      .key {
      }

      .description {
        padding-left: 2rem;
      }
    }
  }

  .verification-container {
    background-color: var(--oe-background-color);
    height: 100%;
  }

  .verification-grid {
    user-select: none;
  }

  .verification-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    align-items: stretch;
    gap: 0.5rem;
  }

  .no-items-message {
    font-size: 1.2rem;
  }

  .verification-controls-title {
    text-align: center;
    font-family: sans-serif;
    font-weight: normal;
    font-size: 1.4rem;
    letter-spacing: 0em;
    color: var(--oe-font-color);
  }

  .verification-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: stretch;
    padding: 1rem;
    gap: 1rem;
    color: var(--oe-font-color);
  }
`;
