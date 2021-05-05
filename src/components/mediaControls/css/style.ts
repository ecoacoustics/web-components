import { css } from "lit";

export const mediaControlsStyles = css`
  #action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: solid thin var(hsl(206.93deg, 100%, 24.9%));
    padding: 0.1rem 0.5rem;
    border-radius: var(0.5rem);
    cursor: pointer;
    font-size: 1rem;
    min-width: 2.8rem;
    min-height: 2.3rem;

    svg {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
`;
