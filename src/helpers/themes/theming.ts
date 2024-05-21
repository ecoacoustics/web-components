import { css } from "lit";

// TODO: these should use computed values
export const theming = css`
  :host {
    --oe-primary-color: hsl(206.93deg, 100%, 24.9%);
    --oe-primary-background-color: #f7f7fa;

    --oe-secondary-color: rgb(221, 218, 245);
    --oe-secondary-background-color: #f6f0f4;

    --oe-disabled-color: #f7f7fa;
    --oe-disabled-background-color: #f6f0f4;

    --oe-accent-color: #f7f7fa;
    --oe-accent-background-color: #f6f0f4;

    --oe-hover-color: #f6f0f4;
    --oe-hover-background-color: #f7f7fa;

    --oe-selected-color: #a7a7da;
    --oe-selected-background-color: #d6d0f4;

    --oe-panel-color: #f7f7fa;
    --oe-panel-background-color: #f6f0f4;

    --oe-background-color: #f7f7fa;
    --oe-text-color: #1c1c1e;

    --oe-font-family: sans-serif;
  }

  button:disabled,
  input:disabled {
    filter: grayscale(100%);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .oe-btn-primary {
    color: var(--oe-primary-color);
    background-color: var(--oe-primary-background-color);
    border: none;
    border-radius: 8px;
    margin: 0.1rem;
    font-size: 0.9rem;
    font-family: var(--oe-font-family);
    box-shadow: 4px 4px 8px var(--oe-primary-background-color);
    padding: 1rem;
    padding-left: 2rem;
    padding-right: 2rem;

    &:hover {
      background-color: var(--oe-secondary-color);
      color: var(--oe-primary-color);
      cursor: pointer;
      animation: ripple-animation 0.6s linear;
    }
  }

  .oe-btn-secondary {
    color: var(--oe-text-color);
    background-color: var(--oe-secondary-color);
    border: none;
    border-radius: 8px;
    margin: 0.1rem;
    font-size: 0.9rem;
    font-family: var(--oe-font-family);
    box-shadow: 4px 4px 8px var(--oe-secondary-background-color);
    padding: 1rem;
    padding-left: 2rem;
    padding-right: 2rem;

    &:hover {
      background-color: var(--oe-primary-color);
      color: var(--oe-secondary-color);
      cursor: pointer;
      animation: ripple-animation 0.6s linear;
    }
  }
`;
