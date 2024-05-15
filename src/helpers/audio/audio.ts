import { IAudioInformation, MESSAGE_PROCESSOR_READY, SpectrogramOptions, State } from "./state";
import { IAudioMetadata, parseBlob } from "music-metadata-browser";
import bufferBuilderProcessorPath from "./buffer-builder-processor.ts?worker&url";
// import workerPath from "./worker.ts?worker&url";
import WorkerConstructor from "./worker.ts?worker&inline";
import { Size } from "../../models/rendering";

interface ICachedAudio {
  response: Response;
  metadata: IAudioMetadata;
}

export class AudioHelper {
  public constructor() {
    // const spectrogramWorker = AudioHelper.worker || new Worker(new URL(workerPath, import.meta.url));
    this.spectrogramWorker = new WorkerConstructor();
  }

  private readonly spectrogramWorker: Worker | undefined;
  private processorNode: AudioWorkletNode | undefined;
  private state: State | undefined;
  private sampleBuffer: SharedArrayBuffer | undefined;
  private offscreenCanvas: OffscreenCanvas | undefined;
  private cachedFile!: ICachedAudio;

  public get canvasTransferred(): boolean {
    return this.offscreenCanvas !== undefined;
  }

  public async connect(src: string, canvas: HTMLCanvasElement, options: SpectrogramOptions): Promise<IAudioMetadata> {
    const downloadedBuffer = await this.fetchAudio(src);
    const metadata = this.cachedFile.metadata;

    const context = await this.createAudioContext(metadata, downloadedBuffer);

    // the number of samples after which to trigger a render of the spectrogram
    // the balance of this number is a performance tradeoff
    // - too many samples and we'll use more memory and render in larger clunky chunks
    // - too few samples and we'll be rendering too often and hit performance bottlenecks
    //   e.g. with canvas painting, wasm interop, signalling primitives, etc.
    //
    // about one seconds-worth of samples
    const segmentSize =
      Math.floor(metadata.format.sampleRate! / options.windowStep) * options.windowStep;
    this.state = State.createState(segmentSize);
    this.sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * segmentSize);

    if (!this.canvasTransferred) {
      this.offscreenCanvas = canvas.transferControlToOffscreen();
    }

    this.setupWorker(metadata, options);
    this.setupProcessor(context);

    console.time("rendering");
    return metadata;
  }

  public resizeCanvas(size: Size) {
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized");
    }

    this.spectrogramWorker.postMessage(["resize-canvas", size]);
  }

  /**
   * This method is similar to `connect()`, however, it can re-use:
   *  - workers
   *  - state objects
   *  - canvas references
   *  - shared buffers
   *
   * What it cannot re-use:
   *  - OfflineAudioContext
   *  - AudioWorkletProcessor
   */
  public async regenerateSpectrogramOptions(options: SpectrogramOptions): Promise<IAudioMetadata> {
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized");
    }

    const downloadedBuffer = await this.cachedBuffer();
    const metadata = this.cachedMetadata();
    const context = await this.createAudioContext(metadata, downloadedBuffer);

    this.setupProcessor(context);
    this.spectrogramWorker.postMessage(["regenerate-spectrogram", options]);

    return metadata;
  }

  /**
   * This method is similar to `regenerateSpectrogramOptions()` in that it can re-use:
   *  - Workers
   *  - Canvas References
   *
   * But it cannot re-use:
   *  - OfflineAudioContext
   *  - AudioWorkletProcessor
   *  - Shared Buffers
   *  - State
   *
   * This is useful if you are changing audio source because different audio sources may require different buffer sizes
   */
  public async regenerateSpectrogram(src: string, options: SpectrogramOptions): Promise<IAudioMetadata> {
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized");
    }

    const downloadedBuffer = await this.fetchAudio(src);
    const metadata = this.cachedFile.metadata;

    const context = await this.createAudioContext(metadata, downloadedBuffer);

    const segmentSize =
      Math.floor(metadata.format.sampleRate! / options.windowStep) * options.windowStep;
    this.state = State.createState(segmentSize);
    this.sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * segmentSize);

    this.setupProcessor(context);

    const audioInformation: IAudioInformation = {
      startSample: 0,
      endSample: metadata.format.duration! * metadata.format.sampleRate!,
      sampleRate: metadata.format.sampleRate!,
    };

    this.spectrogramWorker!.postMessage(
      [
        "new-buffers",
        {
          state: this.state.buffer,
          sampleBuffer: this.sampleBuffer,
          spectrogramOptions: options,
          audioInformation,
        },
      ],
    );

    return metadata;
  }

  private setupProcessor(context: OfflineAudioContext): void {
    if (
      this.state === undefined ||
      this.sampleBuffer === undefined ||
      this.processorNode === undefined
    ) {
      throw new Error("connect must be called before setupProcessor");
    }

    this.processorNode.port.postMessage(["setup", { state: this.state.buffer, sampleBuffer: this.sampleBuffer }]);

    this.processorNode.port.onmessage = (event: MessageEvent) => {
      if (event.data == MESSAGE_PROCESSOR_READY) {
        context.startRendering();
      }
    };
  }

  private setupWorker(metadata: IAudioMetadata, options: SpectrogramOptions): void {
    if (this.state === undefined || this.sampleBuffer === undefined || this.offscreenCanvas === undefined) {
      throw new Error("connect must be called before setupWorker");
    }

    const audioInformation: IAudioInformation = {
      startSample: 0,
      endSample: metadata.format.duration! * metadata.format.sampleRate!,
      sampleRate: metadata.format.sampleRate!,
    };

    this.spectrogramWorker!.postMessage(
      [
        "setup",
        {
          state: this.state.buffer,
          sampleBuffer: this.sampleBuffer,
          canvas: this.offscreenCanvas,
          spectrogramOptions: options,
          audioInformation,
        },
      ],
      [this.offscreenCanvas],
    );
  }

  private async fetchAudio(src: string): Promise<ArrayBuffer> {
    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    const response = await fetch(src);

    const cachedResponse = response.clone();
    const responseBuffer = await response.arrayBuffer();

    const cachedMetadata = await parseBlob(new Blob([responseBuffer]));

    this.cachedFile = {
      response: cachedResponse,
      metadata: cachedMetadata,
    };

    return responseBuffer;
  }

  private async cachedBuffer(): Promise<ArrayBuffer> {
    const cacheClone = this.cachedFile.response.clone();
    const buffer = await this.cachedFile.response.arrayBuffer();
    this.cachedFile.response = cacheClone;

    return buffer;
  }

  private cachedMetadata(): IAudioMetadata {
    return this.cachedFile.metadata;
  }

  private async createAudioContext(metadata: IAudioMetadata, buffer: ArrayBuffer): Promise<OfflineAudioContext> {
    const format = metadata.format;
    const length = format.duration! * format.sampleRate! * format.numberOfChannels!;

    const context = new OfflineAudioContext({
      numberOfChannels: format.numberOfChannels!,
      sampleRate: format.sampleRate!,
      length,
    });

    const decodedBuffer = await context.decodeAudioData(buffer);
    const source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });
    await context.audioWorklet.addModule(new URL(bufferBuilderProcessorPath, import.meta.url));
    this.processorNode = new AudioWorkletNode(context, "buffer-builder-processor");
    source.connect(this.processorNode).connect(context.destination);

    source.start();

    context.addEventListener("complete", () => {
      if (!this.state) {
        throw new Error("state must be defined");
      }

      this.state.finished();
      console.timeEnd("rendering");
    });

    return context;
  }
}
