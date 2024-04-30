import { AudioModel } from "models/recordings";
import { MESSAGE_PROCESSOR_READY, SpectrogramOptions, State } from "./state";

export class AudioHelper {
  static connect(
    audioElement: HTMLAudioElement,
    canvas: HTMLCanvasElement,
    audioModel: AudioModel,
    spectrogramOptions: SpectrogramOptions,
  ) {
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
        const processorNode = new AudioWorkletNode(context, "buffer-builder-processor");
        const spectrogramWorker = new Worker("src/components/helpers/audio/worker.ts", {
          type: "module",
        });

        source.connect(processorNode).connect(context.destination);

        const sampleRate = audioModel.sampleRate;

        // the number of samples after which to trigger a render of the spectrogram
        // the balance of this number is a performance tradeoff
        // - too many samples and we'll use more memory and render in larger clunky chunks
        // - too few samples and we'll be rendering too often and hit performance bottlenecks e.g. with canvas painting, wasm interop, signalling primitives, etc.
        const renderSize = Math.floor(
          sampleRate * (spectrogramOptions.windowSize - spectrogramOptions.windowOverlap)
        ); // about one seconds-worth of samples

        // the buffer is where we write samples to. Why bigger? If the processor emits non-aligned frames of samples
        // we can write the overflow to the buffer and use it in the next render
        const bufferSize = renderSize * 2;

        const state = State.createState(renderSize);
        const sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * bufferSize);
        const offscreenCanvas = canvas.transferControlToOffscreen();

        // 2. wait for buffers to be assigned into the processor
        processorNode.port.onmessage = (event: MessageEvent) => {
          if (event.data == MESSAGE_PROCESSOR_READY) {
            // 3. then start the audio source and start the processor
            source.start();
            context.startRendering();
          }
        };

        // 4. when the rendering is complete, signal the worker to finish (and render the last frame)
        context.addEventListener("complete", () => {
          state.finished();
        });

        // give buffers and canvas to the worker
        spectrogramWorker.postMessage(
          [state.buffer, sampleBuffer, offscreenCanvas, spectrogramOptions],
          [offscreenCanvas],
        );

        // 1. give state and sample buffer to the processor - this will kick start the process
        processorNode.port.postMessage([state.buffer, sampleBuffer]);
      });
  }
}
