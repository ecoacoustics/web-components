import { State } from "./state";
import { IAudioMetadata, parseBlob } from "music-metadata-browser";
import bufferBuilderProcessorPath from "./buffer-builder-processor.ts?worker&url";
// import workerPath from "./worker.ts?worker&url";
import WorkerConstructor from "./worker.ts?worker&inline";
import { Size } from "../../models/rendering";
import { IAudioInformation, SpectrogramOptions } from "./models";
import {
  BUFFER_PROCESSOR_NAME,
  ProcessorSetupMessage,
  WorkerRegenerateSpectrogramMessage,
  WorkerResizeCanvasMessage,
  WorkerSetupMessage,
} from "./messages";

export class AudioHelper {
  private readonly spectrogramWorker: Worker | null = null;
  private readonly state: State;
  private readonly sampleBuffer: SharedArrayBuffer;

  private cachedResponse: Response | null = null;
  private cachedAudioInformation: IAudioInformation | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;

  // This data changes every time we render.
  // Keeping them as single instance variables resulted in race conditions
  // We keep references here to disconnect the audio graph on disposal.
  private generationData: Map<number, AudioBufferSourceNode> = new Map();

  private segmentSize = 44100 as const;
  private generation = 0;

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
    this.state = State.createState();
    this.sampleBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.segmentSize);
  }

  public get canvasTransferred(): boolean {
    return !!this.offscreenCanvas;
  }

  public async connect(
    src: string,
    canvas: HTMLCanvasElement,
    options: SpectrogramOptions,
  ): Promise<IAudioInformation> {
    if (this.offscreenCanvas) {
      throw new Error("Connect can only be called once. Use regenerateSpectrogram to update the spectrogram.");
    }

    const now = performance.now();

    this.offscreenCanvas = canvas.transferControlToOffscreen();
    this.setupWorker();

    const info = await this.render(options, this.generation, src);

    console.log("audio: connect complete", performance.now() - now);
    return info;
  }

  public async changeSource(src: string, options: SpectrogramOptions): Promise<IAudioInformation> {
    //console.log("audio: change source");
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized. Call connect() first.");
    }

    const newGeneration = await this.abort();
    this.spectrogramWorker.postMessage(["clear-canvas"]);

    const info = await this.render(options, newGeneration, src);

    return info;
  }

  public async regenerateSpectrogram(options: SpectrogramOptions) {
    const now = performance.now();
    //console.log("audio: regenerate");
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized. Call connect() first.");
    }

    const newGeneration = await this.abort();

    await this.render(options, newGeneration);

    console.log("audio: regenerate complete", performance.now() - now);
  }

  public resizeCanvas(size: Size) {
    if (!this.spectrogramWorker) {
      throw new Error("Worker is not initialized");
    }
    const message: WorkerResizeCanvasMessage = ["resize-canvas", size];
    this.spectrogramWorker.postMessage(message);
  }

  private async abort() {
    const abortedGeneration = this.generation;
    //console.log("audio: abort start", { abortedGeneration });

    const metadata = this.generationData.get(abortedGeneration);

    if (metadata) {
      const source = metadata;
      // There is no way to stop or destroy an OfflineAudioContext
      //
      // Chrome and firefox have different implementations of the audio worklet.
      // (Returning `false` from the `process` method may not stop the processor)
      // One way to tell both that we no longer want it to process is to disconnect
      // the graph! No more input, no more frame buffers!
      source.disconnect();

      this.generationData.delete(abortedGeneration);
    }

    // This is multithreaded-async.
    // We use generations to trigger old processors to discard their writes.
    // The worker should also stop processing even partway through it's work loop.
    const generation = this.state.reset();
    this.generation = generation;

    await this.state.waitForWorkerIdle();

    //console.log("audio: abort complete", { abortedGeneration, generation: this.generation });
    return generation;
  }

  /**
   * Internal render function. Does not check if we need to abort.
   * @param options the spectrogram options
   * @param generation the generation number
   * @param src  if provided fetches the audio at the supplied source, otherwise clones a buffer of the last response
   */
  private async render(
    options: SpectrogramOptions,
    generation: number,
    src: string | null = null,
  ): Promise<IAudioInformation> {
    const downloadedBuffer = src ? await this.fetchAudio(src) : await this.cachedBuffer();
    const info = this.cachedAudioInformation!;

    // recreate the processor every time!
    await this.createAudioContext(info, downloadedBuffer, generation);

    //console.log(`audio (${generation}): audio context created, starting spectrogram generation`);
    this.regenerateWorker(options, info, generation);

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
    console.log("CHANGE SOURCE");
    if (!this.spectrogramWorker || !this.state) {
      throw new Error("Worker is not initialized. Call connect() first.");
    }

    this.abort();

    const { response, metadata, audioInformation } = await this.fetchAudio(src);
    this.context = await this.createAudioContext(metadata, response);
    this.setupProcessor(this.context);

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

    this.state.reset();

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

  private abort() {
    console.log("ABORTED");
    if (!this.state) {
      throw new Error("Shared state is not defined");
    }

    if (this.state.isFinished()) {
      return;
    }

    // this is multithreaded-async, and we don't wait for results
    // this means that we can't guarantee that the processor noticed an abort before we reset state
    // we don't want to deal with the complexity of this now, but this may be the cause
    // of a race condition in some very unlikely cases
    this.state.startAbort();

    // there is no way to stop or destroy an OfflineAudioContext
    // all we can do is set it to null and hope browsers destroy it in garbage collection
    this.context = null;

    let i = 0;
    while (this.state.aborting) {
      // noop
      i++;
    }

    console.log("waited n cycles to abort", i);
  }

  private createAudioInformation(metadata: IAudioMetadata): IAudioInformation {
    if (!metadata.format.duration || !metadata.format.sampleRate || !metadata.format.numberOfChannels) {
      throw new Error("Could not determine all audio metadata");
    }

    return Object.freeze({
      startSample: 0,
      endSample: metadata.format.duration * metadata.format.sampleRate,
      sampleRate: metadata.format.sampleRate,
      channels: metadata.format.numberOfChannels,
      duration: metadata.format.duration,
    });
  }

  private async fetchAudio(src: string): Promise<ArrayBuffer> {
    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    const tag = `audio (${this.generation}): fetch and decode audio`;
    console.time(tag);
    const response = await fetch(src);

    const cachedResponse = response.clone();
    const responseBuffer = await response.arrayBuffer();
    const cachedMetadata = await parseBlob(new Blob([responseBuffer]));
    const audioInformation = this.createAudioInformation(cachedMetadata);

    this.cachedResponse = cachedResponse;
    this.cachedAudioInformation = audioInformation;

    console.timeEnd(tag);
    return responseBuffer;
  }

  private async cachedBuffer(): Promise<ArrayBuffer> {
    if (!this.cachedResponse) {
      throw new Error("No cached file");
    }

    const cacheClone = this.cachedResponse.clone();
    const buffer = await this.cachedResponse.arrayBuffer();
    // todo: needed?
    this.cachedResponse = cacheClone;

    return buffer;
  }

  private async createAudioContext(info: IAudioInformation, buffer: ArrayBuffer, generation: number) {
    const length = info.duration * info.sampleRate * info.channels;

    //! creates a buffer the size of the entire audio file
    const context = new OfflineAudioContext({
      numberOfChannels: info.channels,
      sampleRate: info.sampleRate,
      length,
    });

    const decodedBuffer = await context.decodeAudioData(buffer);
    const source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });

    await context.audioWorklet.addModule(new URL(bufferBuilderProcessorPath, import.meta.url));
    const processor = new AudioWorkletNode(context, BUFFER_PROCESSOR_NAME);

    source.connect(processor).connect(context.destination);

    // do not refactor into the class - we don't want to mixup state with a
    // object that is recreated many times
    context.addEventListener("complete", () => {
      //console.log(`audio (${generation}): context complete`);
      this.state.processorComplete(generation);
    });

    //console.log(`audio (${generation}):context: setup start`, this.state.isProcessorReady(generation));
    const success = await this.setupProcessor(processor, generation);

    if (success) {
      this.generationData.set(generation, source);

      //console.log(`audio (${generation}):context: source start and start rendering`);

      source.start();
      context.startRendering();
    }

    // otherwise just forget about everything, don't bother to start.
    // no instance state to clean up
    // hopefully the garbage collector will clean up the context
  }

  // messages

  private async setupWorker() {
    const message: WorkerSetupMessage = [
      "setup",
      {
        state: this.state.stateBuffer,
        sampleBuffer: this.sampleBuffer,
        canvas: this.offscreenCanvas!,
      },
    ];

    this.spectrogramWorker!.postMessage(message, [this.offscreenCanvas!]);

    await this.state.waitForWorkerReady();
  }

  // very specifically not using instance value of this.generation
  // we want that value closed over so it can't change
  private async setupProcessor(processor: AudioWorkletNode, generation: number): Promise<boolean> {
    const message: ProcessorSetupMessage = [
      "setup",
      { state: this.state.stateBuffer, sampleBuffer: this.sampleBuffer, generation },
    ];

    processor.port.postMessage(message);

    return await this.state.waitForProcessorReady(generation);
  }

  private regenerateWorker(options: SpectrogramOptions, audioInformation: IAudioInformation, generation: number) {
    const message: WorkerRegenerateSpectrogramMessage = [
      "regenerate-spectrogram",
      {
        options,
        audioInformation,
        generation,
      },
    ];

    this.spectrogramWorker!.postMessage(message);
  }
}
