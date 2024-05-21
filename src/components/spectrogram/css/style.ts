import { css } from "lit";

export const spectrogramStyles = css`
  :host {
    display: inline-block;
  }

  #spectrogram-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  #spectrogram-container > canvas {
    position: relative;
    height: 100%;
  }
`;
