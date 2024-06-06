import { css } from "lit";

export const verificationGridStyles = css`
  #highlight-box {
    position: absolute;
    display: none;
    top: 0px;
    left: 0px;
    width: 0px;
    height: 0px;
    position: absolute;
    /* background-color: #00bbff; */
    background-color: #0099ee;
    border: solid 2px #002299;
    border-radius: 1rem;
    opacity: 0.3;
    z-index: 5;
  }

  .keyboard-shortcuts {
    display: grid;
    position: relative;
    grid-template-columns: 1fr 1fr;
    gap: var(--oe-spacing);
    width: 100%;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* TODO: fix placement */
  .statistics-section {
    position: absolute;
    display: inline-block;
    width: fit-content;
    padding: var(--oe-spacing);
  }

  .verification-container {
    background-color: var(--oe-background-color);
    height: 100%;
  }

  .verification-grid {
    user-select: none;
  }

  .verification-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: stretch;
    gap: var(--oe-spacing);
  }

  .no-items-message {
    font-size: 1.2rem;
  }

  .verification-controls-title {
    text-align: center;
    font-family: sans-serif;
    font-weight: normal;
    font-size: 1.4rem;
    letter-spacing: 0em;
    color: var(--oe-font-color);
  }

  .verification-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    align-items: end;
    padding: var(--oe-spacing);
    gap: var(--oe-spacing);
    color: var(--oe-font-color);
  }

  .decision-controls {
    h2 {
      display: block;
    }

    .decision-control-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  .decision-controls-left,
  .decision-controls-right {
    display: flex;
  }

  /*
    We apply styles to the <template> elements here because we can access them
    through light dom selectors.
    We cannot target the template elements inside the verification-grid-tile
    because they are reflected into the shadow dom, but not actually rendered
    in the tile dom (meaning that we can't style them in the tile component).
  */
  oe-spectrogram {
    @media (max-width: 600px) {
      /* TODO: do this better. This is a hacky solution for now */
      height: 380px;
    }
  }
`;
