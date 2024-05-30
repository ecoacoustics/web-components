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

    /*
      We set the minimum height to 64 because the minimum FFT window size that
      we support is 64 samples. Therefore, if the user does not specify a container
      with a minimum height, we should at least show 64px in height (the width will auto-scale)
    */
    min-height: 64px;
  }
`;
