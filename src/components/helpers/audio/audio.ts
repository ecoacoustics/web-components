import { IAudioInformation, MESSAGE_PROCESSOR_READY, SpectrogramOptions, State } from "./state";
import { IAudioMetadata, parseBlob } from "music-metadata-browser";
import bufferBuilderProcessorPath from "./buffer-builder-processor.ts?worker&url";
import WorkerConstructor from "./worker.ts?worker";

export class AudioHelper {
  static worker: Worker | undefined;

  static async connect(
    audioElement: HTMLAudioElement,
    canvas: HTMLCanvasElement,
    spectrogramOptions: SpectrogramOptions,
  ): Promise<IAudioMetadata> {
    let context: OfflineAudioContext;
    let source: AudioBufferSourceNode;
    let metadata: IAudioMetadata;

    console.log("start spectrogram rendering", spectrogramOptions);

    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    return (
      fetch(audioElement.src)
        .then((response) => response.arrayBuffer())
        .then(async (downloadedBuffer) => {
          // TODO: One the web codec API's are more stable, we should replace this
          // TODO: We might want to move this out to the spectrogram component instead
          metadata = await parseBlob(new Blob([downloadedBuffer]));

          const length = metadata.format.duration! * metadata.format.sampleRate! * metadata.format.numberOfChannels!;
          console.log(
            "channels, sample rate, duration, length",
            metadata.format.numberOfChannels,
            metadata.format.sampleRate,
            metadata.format.duration,
            length,
          );
          context = new OfflineAudioContext({
            numberOfChannels: metadata.format.numberOfChannels!,
            sampleRate: metadata.format.sampleRate!,
            length,
          });

          return context.decodeAudioData(downloadedBuffer);
        })
        .then((decodedBuffer) => (source = new AudioBufferSourceNode(context, { buffer: decodedBuffer })))
        .then(() => context.audioWorklet.addModule(bufferBuilderProcessorPath))
        // .then(() => context.audioWorklet.addModule(bufferBuilderProcessorPath))
        .then(() => {
          const processorNode = new AudioWorkletNode(context, "buffer-builder-processor");
          const spectrogramWorker = AudioHelper.worker || new WorkerConstructor();

          source.connect(processorNode).connect(context.destination);

          // the number of samples after which to trigger a render of the spectrogram
          // the balance of this number is a performance tradeoff
          // - too many samples and we'll use more memory and render in larger clunky chunks
          // - too few samples and we'll be rendering too often and hit performance bottlenecks e.g. with canvas painting, wasm interop, signalling primitives, etc.
          const windowStep = spectrogramOptions.windowSize - spectrogramOptions.windowOverlap;
          const segmentSize = Math.floor(metadata.format.sampleRate! / windowStep) * windowStep; // about one seconds-worth of samples

          // todo: inline - historically the buffer was bigger for overflow reasons, but this is no longer necessary
          const bufferSize = segmentSize;

          const state = State.createState(segmentSize);
          const sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * bufferSize);

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
            console.timeEnd("rendering");
          });

          // TODO: This should be passed in the function signature and derived from the render window
          // TODO: Take sample rate out of spectrogram options and move to audioModel
          const tempAudioInformation: IAudioInformation = {
            startSample: 0,
            endSample: source.buffer!.duration * metadata.format.sampleRate!,
            sampleRate: metadata.format.sampleRate!,
          };

          const offscreenCanvas = canvas.transferControlToOffscreen();

          // give buffers and canvas to the worker
          spectrogramWorker.postMessage(
            [
              "setup",
              {
                state: state.buffer,
                sampleBuffer,
                canvas: offscreenCanvas,
                spectrogramOptions,
                audioInformation: tempAudioInformation,
              },
            ],
            [offscreenCanvas],
          );

          console.time("rendering");
          // 1. give state and sample buffer to the processor - this will kick start the process
          processorNode.port.postMessage(["setup", { state: state.buffer, sampleBuffer }]);

          return metadata;
        })
    );
  }
}
