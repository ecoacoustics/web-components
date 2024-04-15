import { SharedBufferWorkletNode } from "./shared-buffer-worklet-node";

export class AudioHelper {
  static generateFft() {}

  static connect(audioElement: HTMLAudioElement, canvasElement: HTMLCanvasElement) {
    const context = new OfflineAudioContext({
      numberOfChannels: 1,
      length: 5 * 22050,
      sampleRate: 22050,
    });

    // I usually find that AudioContext is much easier to debug than an OfflineAudioContext
    // const context = new AudioContext({
    //   sampleRate: 22050,
    // });

    let source: any;

    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    fetch(audioElement.src)
      .then((response) => response.arrayBuffer())
      .then((downloadedBuffer) => context.decodeAudioData(downloadedBuffer))
      .then((decodedBuffer) => {
        source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });
      })
      .then(() => context.audioWorklet.addModule("src/components/helpers/fft-processor.ts"))
      .then(() => {
        const sbwNode = new SharedBufferWorkletNode(context);

        new AudioWorkletNode(context, "fft-processor");

        sbwNode.onInitialized = () => {
          source.connect(sbwNode).connect(context.destination);

          source.start();
        
          context.startRendering().then((renderedBuffer) => {
            const fft = renderedBuffer.getChannelData(0);
          
            // paint the fft to the canvas
            const canvasContext = canvasElement.getContext("2d");
            const canvasWidth = canvasElement.width;
            const canvasHeight = canvasElement.height;
            const fftLength = fft.length;
            const fftStep = canvasWidth / fftLength;
            const fftHeight = canvasHeight / 2;
            canvasContext.fillStyle = "white";
            canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
            canvasContext.fillStyle = "black";
            for (let i = 0; i < fftLength; i++) {
              canvasContext.fillRect(i * fftStep, fftHeight, fftStep, fft[i] * fftHeight);
            }

            source.stop();
          });
        };
      });
  }
}
