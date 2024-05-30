import { css } from "lit";

export const verificationGridStyles = css`
  :host {
    --text-color: #1c1c1e;
  }

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

  .verification-container {
    background-color: var(--oe-background-color);
    height: 100%;
  }

  .verification-grid {
    user-select: none;
  }

  .verification-grid {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    max-height: 100vh;

    & > * {
      margin: 0.5rem;
    }
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
    color: var(--text-color);
  }

  .verification-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    color: var(--text-color);
    align-items: stretch;
  }
`;
