import { css } from "lit";

export const verificationGridStyles = css`
  :host {
    --secondary-color: black;
  }

  #highlight-box {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 0px;
    height: 0px;
    position: absolute;
    background-color: #00bbff;
    border: solid medium #00bbff;
    border-radius: 0.5rem;
    opacity: 0.3;
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

  .shortcut-legend {
    & > .shortcut-legend-title {
      font-weight: bold;
    }

    /*
     Copied from MDN
     https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd
    */
    kbd {
      background-color: #eee;
      border-radius: 3px;
      border: 1px solid #b4b4b4;
      box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 2px 0 0 rgba(255, 255, 255, 0.7) inset;
      color: #333;
      display: inline-block;
      font-size: 0.85em;
      font-weight: 700;
      line-height: 1;
      padding: 2px 4px;
      white-space: nowrap;
    }
  }

  .verification-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }

  .verification-controls-title {
    text-align: center;
    font-family: sans-serif;
    font-weight: normal;
  }

  ::part(sub-selection-checkbox) {
  }
`;
