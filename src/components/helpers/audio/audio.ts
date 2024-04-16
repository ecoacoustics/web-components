import { ISharedBuffers } from "./buffer-builder-processor";

export class AudioHelper {
  static generateFft() {}

  static connect(audioElement: HTMLAudioElement, paintSpectrogram: (data: Float32Array) => void) {
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
      .then(() => context.audioWorklet.addModule("src/components/helpers/audio/buffer-builder-processor.ts"))
      .then(() => {
        const bufferProcessorNode = new AudioWorkletNode(context, "buffer-builder-processor");
        const bufferKernelWorker = new Worker("src/components/helpers/audio/worker.ts");

        const sharedBuffers: ISharedBuffers = {
          states: new SharedArrayBuffer(1024),
          buffer: new SharedArrayBuffer(1024),
        };

        bufferKernelWorker.postMessage({ ...sharedBuffers });
        bufferProcessorNode.port.postMessage(sharedBuffers);

        source.connect(bufferProcessorNode).connect(context.destination);

        bufferKernelWorker.onmessage = (event) => {
          const { fftData } = event.data;
          paintSpectrogram(fftData);
        };

        bufferProcessorNode.port.onmessage = (event) => {
          if (event.data === "ready") {
            source.start();
            context.startRendering();
          }
        };
      });
  }
}
