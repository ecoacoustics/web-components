import { css } from "lit";

export const verificationGridStyles = css`
  .grid {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;

    & > * {
      margin: 0.5rem;
      border-radius: 0.5rem;
      height: 200px;
    }
  }

  .sub-selection-checkbox {
    position: absolute;
    z-index: 1;
  }

  .no-items-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    font-size: 1.2rem;
  }
`;
