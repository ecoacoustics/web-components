import { IAudioInformation, MESSAGE_PROCESSOR_READY, SpectrogramOptions, State } from "./state";
import { IAudioMetadata, parseBlob } from "music-metadata-browser";
import bufferBuilderProcessorPath from "./buffer-builder-processor.ts?worker&url";
// import workerPath from "./worker.ts?worker&url";
import WorkerConstructor from "./worker.ts?worker&inline";
import { Size } from "../../models/rendering";

interface IFetchedAudio<T = Response | ArrayBuffer> {
  response: T;
  metadata: IAudioMetadata;
  audioInformation: IAudioInformation;
}

export class AudioHelper {
  public constructor() {
    // const spectrogramWorker = AudioHelper.worker || new Worker(new URL(workerPath, import.meta.url));
    this.spectrogramWorker = new WorkerConstructor();

    // the number of samples after which to trigger a render of the spectrogram
    // the balance of this number is a performance tradeoff
    // - too many samples and we'll use more memory and render in larger clunky chunks
    // - too few samples and we'll be rendering too often and hit performance bottlenecks
    //   e.g. with canvas painting, wasm interop, signalling primitives, etc.
    //
    // about one seconds-worth of samples
    this.state = State.createState(this.segmentSize);
    this.sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.segmentSize);
  }

  private readonly spectrogramWorker: Worker | undefined;
  private processorNode: AudioWorkletNode | undefined;
  private state: State | undefined;
  private sampleBuffer: SharedArrayBuffer | undefined;
  private offscreenCanvas: OffscreenCanvas | undefined;
  private cachedFile!: IFetchedAudio<Response>;
  private segmentSize = 44100 as const;

  public get canvasTransferred(): boolean {
    return this.offscreenCanvas !== undefined;
  }

  public async connect(src: string, canvas: HTMLCanvasElement, options: SpectrogramOptions): Promise<IAudioMetadata> {
    const { response, metadata, audioInformation } = await this.fetchAudio(src);

    const context = await this.createAudioContext(metadata, response);

    if (!this.canvasTransferred) {
      this.offscreenCanvas = canvas.transferControlToOffscreen();
    }

    this.setupWorker(audioInformation, options);
    this.setupProcessor(context);

    return metadata;
  }

  public resizeCanvas(size: Size) {
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized");
    }

    this.spectrogramWorker.postMessage(["resize-canvas", size]);
  }

  /**
   * @description
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
    if (!this.spectrogramWorker || !this.state) {
      throw new Error("Worker is not initialized. Call connect() first.");
    }

    const downloadedBuffer = await this.cachedBuffer();
    const metadata = this.cachedMetadata();
    const audioInformation = this.cachedAudioInformation();
    const context = await this.createAudioContext(metadata, downloadedBuffer);
    this.setupProcessor(context);

    this.spectrogramWorker.postMessage([
      "regenerate-spectrogram",
      {
        options,
        audioInformation,
      },
    ]);

    return metadata;
  }

  public async changeSource(src: string, options: SpectrogramOptions): Promise<IAudioMetadata> {
    if (!this.spectrogramWorker || !this.state) {
      throw new Error("Worker is not initialized. Call connect() first.");
    }

    const { response, metadata, audioInformation } = await this.fetchAudio(src);
    const context = await this.createAudioContext(metadata, response);
    this.setupProcessor(context);

    this.spectrogramWorker.postMessage([
      "regenerate-spectrogram",
      {
        options,
        audioInformation,
      },
    ]);

    return metadata;
  }

  private setupProcessor(context: OfflineAudioContext): void {
    if (this.state === undefined || this.sampleBuffer === undefined || this.processorNode === undefined) {
      throw new Error("connect must be called before setupProcessor");
    }

    this.state.resetWork();
    this.processorNode.port.postMessage(["setup", { state: this.state.buffer, sampleBuffer: this.sampleBuffer }]);

    this.processorNode.port.onmessage = (event: MessageEvent) => {
      if (event.data == MESSAGE_PROCESSOR_READY) {
        console.time("rendering");
        context.startRendering();
      }
    };
  }

  private setupWorker(audioInformation: IAudioInformation, options: SpectrogramOptions): void {
    if (this.state === undefined || this.sampleBuffer === undefined || this.offscreenCanvas === undefined) {
      throw new Error("connect must be called before setupWorker");
    }

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

  private createAudioInformation(metadata: IAudioMetadata): IAudioInformation {
    return {
      startSample: 0,
      endSample: metadata.format.duration! * metadata.format.sampleRate!,
      sampleRate: metadata.format.sampleRate!,
    };
  }

  private async fetchAudio(src: string): Promise<IFetchedAudio<ArrayBuffer>> {
    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    const response = await fetch(src);

    const cachedResponse = response.clone();
    const responseBuffer = await response.arrayBuffer();
    const cachedMetadata = await parseBlob(new Blob([responseBuffer]));
    const audioInformation = this.createAudioInformation(cachedMetadata);

    this.cachedFile = {
      response: cachedResponse,
      metadata: cachedMetadata,
      audioInformation,
    };

    return {
      response: responseBuffer,
      metadata: cachedMetadata,
      audioInformation,
    };
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

  private cachedAudioInformation(): IAudioInformation {
    return this.cachedFile.audioInformation;
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
