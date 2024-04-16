import { TwoDFft } from "models/rendering";
import { SharedBufferWorkletNode } from "./shared-buffer-worklet-node";

export class AudioHelper {
  static generateFft() {}

  static connect(audioElement: HTMLAudioElement, renderCallback: (data: TwoDFft) => void) {
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
            const fft = [renderedBuffer.getChannelData(0)];

            renderCallback(fft);

            // TODO: we might want to call this
            // source.stop();
          });
        };
      });
  }
}
