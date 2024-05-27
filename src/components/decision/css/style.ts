import { css } from "lit";

export const decisionStyles = css`
  :host {
    --primary-color: hsl(206.93deg, 100%, 24.9%);
    --secondary-color: white;
  }

  #decision-button {
    display: inline-flex;
    position: relative;
  }

  .disabled {
    filter: grayscale(100%);
    opacity: 0.5;
  }

  ::part(decision-button) {
    padding: 0.5rem;
    border: solid 1px var(--primary-color);
    border-radius: 0.5rem;
    background-color: var(--secondary-color);
    margin: 0.1rem;

    &:hover {
      background-color: var(--primary-color);
      color: var(--secondary-color);
      cursor: pointer;
    }
  }
`;
