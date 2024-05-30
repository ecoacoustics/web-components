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

    --oe-info-color: var(--oe-text-color);
    --oe-info-background-color: #e7def7;

    --oe-hover-color: #f6f0f4;
    --oe-hover-background-color: #f7f7fa;

    --oe-selected-color: #a7a7da;
    --oe-selected-background-color: #d6d0f4;

    --oe-panel-color: #eaeaf4;
    --oe-panel-background-color: #f6f0f4;

    --oe-background-color: #f7f7fa;
    --oe-text-color: #1c1c1e;
    --oe-border-rounding: 8px;

    --oe-font-family: sans-serif;
  }

  * {
    font-family: var(--oe-font-family);
  }

  button:disabled,
  input:disabled {
    filter: grayscale(100%);
    opacity: 0.5;
    cursor: not-allowed;
  }

  kbd {
    position: relative;
    display: inline-block;
    color: var(--oe-text-color);
    font-family: "Courier New", Courier, monospace;
    text-align: center;
    font-weight: bold;
    padding-left: 0.5em;
    padding-right: 0.5em;
    z-index: 0;
    margin-top: 0.2rem;

    &::before {
      content: "";
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
      border-radius: 0.13em;
      background: radial-gradient(circle farthest-corner at top right, #ededed, #c8c8c8);
      box-shadow: 0px 0px 0.13em 0.1em rgba(0, 0, 0, 0.2);
      z-index: -1;
    }

    &::after {
      content: "";
      position: absolute;
      top: -0.065em;
      left: -0.065em;
      width: 100%;
      height: 100%;
      padding: 0.13em;
      border-radius: 0.15em;
      background: radial-gradient(circle farthest-corner at bottom right, #cacaca, #cacaca);
      box-shadow: 0.065em 0.065em 0.13em 0.13em rgba(0, 0, 0, 0.5);
      z-index: -2;
    }
  }

  a {
    text-decoration: underline;
    color: var(--oe-primary-color);

    &:hover {
      text-decoration: none;
    }

    &:visited {
    }
  }

  hr {
    border: 0;
    height: 1px;
    background-color: var(--oe-text-color);
    opacity: 0.2;
  }

  .hidden {
    display: none;
  }

  .oe-btn-primary {
    color: var(--oe-primary-color);
    background-color: var(--oe-primary-background-color);
    border: none;
    border-radius: var(--oe-border-rounding);
    margin: 0.1rem;
    font-size: 0.9rem;
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
    border-radius: var(--oe-border-rounding);
    margin: 0.1rem;
    font-size: 0.9rem;
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
