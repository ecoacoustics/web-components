import { css } from "lit";

// TODO: these should use computed values
export const theming = css`
  /*
    The theme is derived from the theme color, hue, chrome, and tone
    therefore, if you want to change the theme of the components, it is
    recommended that you modify these variables so that the theme auto adjusts
    and maintains a good colour ratio and contrast.

    If you want to set the other variables manually e.g. --oe-primary-color
    you can, but changing these colors can lead to accessability and contrast
    issues
  */
  @media (prefers-color-scheme: dark) {
    :host,
    :root {
      --oe-theme-hue: 0deg;
      --oe-theme-saturation: 0%;
      --oe-theme-lightness: 12%;

      /* TODO: get rid of this hack */
      --oe-text-color: white !important;
    }
  }

  /* Light mode (and any other themes besides dark mode) */
  @media not (prefers-color-scheme: dark) {
    :host,
    :root {
      --oe-theme-hue: 247deg;
      --oe-theme-saturation: 57%;
      --oe-theme-lightness: 91%;
    }
  }

  /* TODO: we probably only need :host here */
  :host,
  :root {
    --oe-font-color: white;
    --oe-background-color: black;

    /* Modify these variables below if you are an expert user */
    --oe-primary-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) - 50%),
      calc(var(--oe-theme-lightness) - 30%)
    );
    --oe-primary-background-color: hsl(
      var(--oe-theme-hue),
      var(--oe-theme-saturation),
      calc(var(--oe-theme-lightness) - 40%)
    );

    --oe-secondary-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) - 70%),
      calc(var(--oe-theme-lightness) - 80%)
    );
    --oe-secondary-background-color: hsl(
      var(--oe-theme-hue),
      var(--oe-theme-saturation),
      calc(var(--oe-theme-lightness))
    );

    --oe-accent-color: white;
    --oe-accent-background-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) + 10%),
      calc(var(--oe-theme-lightness) - 20%)
    );

    --oe-info-color: var(--oe-text-color);
    --oe-info-background-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) + 10%),
      calc(var(--oe-theme-lightness) + 20%)
    );

    --oe-selected-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) - 40%));
    --oe-selected-background-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) + 10%),
      calc(var(--oe-theme-lightness) + 10%)
    );

    /* --oe-panel-color: #eaeaf4; */
    --oe-panel-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) + 5%));
    --oe-panel-background-color: hsl(
      var(--oe-theme-hue),
      var(--oe-theme-saturation),
      calc(var(--oe-theme-lightness) - 10%)
    );

    --oe-background-color: hsl(var(--oe-theme-hue), var(--oe-theme-saturation), calc(var(--oe-theme-lightness) + 10%));
    --oe-text-color: hsl(
      var(--oe-theme-hue),
      calc(var(--oe-theme-saturation) - 50%),
      calc(var(--oe-theme-lightness) - 90%)
    );

    --oe-border-rounding: 12px;
    --oe-font-family: sans-serif;
    /* --oe-box-shadow: 4px 4px 8px var(--oe-primary-background-color); */
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

  .btn {
    border: none;
    border-radius: var(--oe-border-rounding);
    margin: 0.1rem;
    font-size: 0.9rem;
    max-width: max-content;
    box-shadow: var(--oe-box-shadow);
    padding: 1em;
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .oe-btn-primary {
    color: var(--oe-primary-color);
    background-color: var(--oe-primary-background-color);

    &:hover {
      background-color: var(--oe-secondary-color);
      color: var(--oe-primary-color);
      cursor: pointer;
      animation: ripple-animation 0.6s linear;
    }
  }

  .oe-btn-secondary {
    color: var(--oe-secondary-color);
    background-color: var(--oe-secondary-background-color);

    &:hover {
      color: var(--oe-primary-color);
      background-color: var(--oe-primary-background-color);
      cursor: pointer;
      animation: ripple-animation 0.6s linear;
    }
  }
`;
