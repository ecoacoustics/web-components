import { css } from "lit";

export const decisionStyles = css`
  #decision-button {
    --decision-color: var(--oe-primary-color);

    position: relative;
    height: 100%;

    > div {
      display: block;

      /*
        We set min-height to 1 relative character height so that if there are
        no additional tags or keyboard shortcuts, the button still has the
        whitespace where they would be
        We do this so that if you look horizontally across the decision buttons
        all the tags are aligned horizontally, all the additional tags are
        aligned horizontally, and all the keyboard shortcuts are aligned
      */
      min-height: 1em;
    }

    .additional-tags {
      font-size: var(--oe-font-size);
    }

    :focus,
    :active {
      outline: none;
      border: none;
    }
  }

  .show-decision-color,
  :active {
    border: var(--oe-border-width) solid var(--decision-color);
  }
`;
