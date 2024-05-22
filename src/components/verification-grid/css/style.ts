import { css } from "lit";

export const verificationGridStyles = css`
  .verification-grid {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;

    & > * {
      margin: 0.5rem;
    }
  }

  .sub-selection-checkbox {
    position: absolute;
    z-index: 2;
  }

  .no-items-message {
    font-size: 1.2rem;
  }

  ::part(sub-selection-checkbox) {
  }
`;
