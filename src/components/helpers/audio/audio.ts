import { IAudioInformation, MESSAGE_PROCESSOR_READY, SpectrogramOptions, State } from "./state";
import { IAudioMetadata, parseBlob } from "music-metadata-browser";
import bufferBuilderProcessorPath from "./buffer-builder-processor.ts?worker&url";
// import workerPath from "./worker.ts?worker&url";
import WorkerConstructor from "./worker.ts?worker&inline";
import { Size } from "models/rendering";

export class AudioHelper {
  private readonly spectrogramWorker: Worker;
  private processorNode: AudioWorkletNode = null!;
  private state: State | undefined;
  private sampleBuffer: SharedArrayBuffer | undefined;
  private offscreenCanvas: OffscreenCanvas | undefined;
  private spectrogramOptions: SpectrogramOptions | undefined;

  public constructor() {
    // const spectrogramWorker = AudioHelper.worker || new Worker(new URL(workerPath, import.meta.url));
    this.spectrogramWorker = new WorkerConstructor();
  }

  public get canvasTransferred(): boolean {
    return this.offscreenCanvas !== undefined;
  }

  public async connect(
    audioElement: HTMLAudioElement,
    canvas: HTMLCanvasElement,
    spectrogramOptions: SpectrogramOptions,
  ): Promise<IAudioMetadata> {
    this.spectrogramOptions = spectrogramOptions;

    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    const response = await fetch(audioElement.src);

    const downloadedBuffer = await response.arrayBuffer();

    // TODO: One the web codec API's are more stable, we should replace this
    // TODO: We might want to move this out to the spectrogram component instead
    const metadata = await parseBlob(new Blob([downloadedBuffer]));

    const length = metadata.format.duration! * metadata.format.sampleRate! * metadata.format.numberOfChannels!;
    console.log(
      "channels, sample rate, duration, length",
      metadata.format.numberOfChannels,
      metadata.format.sampleRate,
      metadata.format.duration,
      length,
    );
    const context = new OfflineAudioContext({
      numberOfChannels: metadata.format.numberOfChannels!,
      sampleRate: metadata.format.sampleRate!,
      length,
    });

    const decodedBuffer = await context.decodeAudioData(downloadedBuffer);

    const source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });

    await context.audioWorklet.addModule(new URL(bufferBuilderProcessorPath, import.meta.url));

    this.processorNode = new AudioWorkletNode(context, "buffer-builder-processor");

    source.connect(this.processorNode).connect(context.destination);

    // the number of samples after which to trigger a render of the spectrogram
    // the balance of this number is a performance tradeoff
    // - too many samples and we'll use more memory and render in larger clunky chunks
    // - too few samples and we'll be rendering too often and hit performance bottlenecks e.g. with canvas painting, wasm interop, signalling primitives, etc.
    const segmentSize =
      Math.floor(metadata.format.sampleRate! / spectrogramOptions.windowStep) * spectrogramOptions.windowStep; // about one seconds-worth of samples

    // todo: inline - historically the buffer was bigger for overflow reasons, but this is no longer necessary
    const bufferSize = segmentSize;

    this.state = State.createState(segmentSize);
    this.sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * bufferSize);

    // 2. wait for buffers to be assigned into the processor
    this.processorNode.port.onmessage = (event: MessageEvent) => {
      if (event.data == MESSAGE_PROCESSOR_READY) {
        // 3. then start the audio source and start the processor
        source.start();
        context.startRendering();
      }
    };

    // 4. when the rendering is complete, signal the worker to finish (and render the last frame)
    context.addEventListener("complete", () => {
      if (!this.state) {
        throw new Error("state must be defined");
      }

      this.state.finished();
      console.timeEnd("rendering");
    });

    // TODO: This should be passed in the function signature and derived from the render window
    const tempAudioInformation: IAudioInformation = {
      startSample: 0,
      endSample: source.buffer!.duration * metadata.format.sampleRate!,
      sampleRate: metadata.format.sampleRate!,
    };

    this.offscreenCanvas = canvas.transferControlToOffscreen();

    // 0. give buffers and canvas to the worker
    this.setupWorker(tempAudioInformation);

    console.time("rendering");
    // 1. give state and sample buffer to the processor - this will kick start the process
    this.setupProcessor();

    return metadata;
  }

  private setupProcessor(): void {
    if (this.state === undefined || this.sampleBuffer === undefined) {
      throw new Error("connect must be called before setupProcessor");
    }

    this.processorNode.port.postMessage(["setup", { state: this.state.buffer, sampleBuffer: this.sampleBuffer }]);
  }

  private setupWorker(tempAudioInformation: IAudioInformation): void {
    if (this.state === undefined || this.sampleBuffer === undefined || this.offscreenCanvas === undefined) {
      throw new Error("connect must be called before setupWorker");
    }

    this.spectrogramWorker.postMessage(
      [
        "setup",
        {
          state: this.state.buffer,
          sampleBuffer: this.sampleBuffer,
          canvas: this.offscreenCanvas,
          spectrogramOptions: this.spectrogramOptions,
          audioInformation: tempAudioInformation,
        },
      ],
      [this.offscreenCanvas],
    );
  }

  public resizeCanvas(size: Size) {
    this.spectrogramWorker.postMessage(["resize-canvas", size]);
  }
}
