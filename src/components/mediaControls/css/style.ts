import { css } from "lit";

export const mediaControlsStyles = css`
  sl-menu-item[checked]::part(base) {
    background-color: var(--oe-selected-color);
    color: var(--oe-font-color);
  }

  .container {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: center;
    margin-top: var(--oe-spacing);
    margin-bottom: var(--oe-spacing);
    color: var(--oe-font-color);
    width: fit-content;
    background-color: var(--oe-background-color);
    border-radius: var(--oe-border-rounding);
    box-shadow: var(--oe-box-shadow);
    font-size: calc(var(--oe-font-size));
    overflow: hidden;

    > :hover {
      background-color: var(--oe-panel-color);
    }

    > *:not(:last-child) {
      border-right: 1px solid var(--oe-font-color-lighter);
    }
  }
`;
