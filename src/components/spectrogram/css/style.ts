import { css } from "lit";

export const spectrogramStyles = css`
  #spectrogram-container {
    position: relative;
    background-color: aqua;
  }

  #spectrogram-container > canvas {
    position: relative;
    width: 100%;
    height: 100%;
  }
`;
