import { css } from "lit";

export const verificationGridStyles = css`
  :host {
    --secondary-color: black;
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

  .selected {
    filter: drop-shadow(var(--secondary-color) 0.5rem 0.5rem);
  }

  .no-items-message {
    font-size: 1.2rem;
  }

  ::part(sub-selection-checkbox) {
  }
`;
