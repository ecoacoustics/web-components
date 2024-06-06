import { css } from "lit";

export const theming = css`
  /* TODO: we probably only need :host here */
  :host,
  :root {
    --oe-theme-hue: 247deg;
    --oe-theme-saturation: 57%;
    --oe-theme-lightness: 91%;

    --oe-background-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) + 20%));
    --oe-font-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) - 50%),
      calc(var(--oe-theme-lightness) - 90%)
    );

    --oe-border-rounding: 12px;
    --oe-font-family: sans-serif;
    /* --oe-box-shadow: 4px 4px 8px var(--oe-primary-color); */

    --oe-primary-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 38%));
    --oe-secondary-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 10%));
    --oe-accent-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 20%));
    --oe-info-color: hsl(207deg, var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 15%));
    --oe-selected-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 5%));
    --oe-panel-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) + 5%));
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
    color: var(--oe-font-color);
    font-family: "Courier New", Courier, monospace;
    text-align: center;
    font-weight: bold;
    padding-left: 0.5em;
    padding-right: 0.5em;
    z-index: 0;
    margin-top: 0.2rem;
    margin: 0.5rem;

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
    color: var(--oe-font-color);

    &:hover {
      text-decoration: none;
    }

    &:visited {
    }
  }

  hr {
    border: 0;
    height: 1px;
    background-color: var(--oe-font-color);
    opacity: 0.2;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }

  label:has(> input[type="checkbox"]) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
  }

  input[type="checkbox"] {
    position: relative;
    accent-color: var(--oe-primary-color);
    width: 1.2rem;
    height: 1.2rem;
  }

  .hidden {
    display: none;
  }

  .oe-btn {
    border: none;
    border-radius: var(--oe-border-rounding);
    margin: 0.1rem;
    font-size: 0.9rem;
    max-width: max-content;
    box-shadow: var(--oe-box-shadow);
    padding: 1em;
    padding-left: 2rem;
    padding-right: 2rem;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
      cursor: pointer;
    }
  }

  .oe-btn-primary {
    border: solid 2px var(--oe-primary-color);
    background-color: var(--oe-background-color);
  }

  .oe-btn-secondary {
    background-color: var(--oe-secondary-color);
  }
`;
