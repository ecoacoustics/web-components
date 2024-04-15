export class SharedBufferWorkletNode extends AudioWorkletNode {
  constructor(context: OfflineAudioContext) {
    super(context, "fft-processor");

    this.sharedBufferWorker = new Worker("src/components/helpers/shared-buffer-worker.js");

    this.sharedBufferWorker.onmessage = this.handleWorkerMessage.bind(this);
    this.port.onmessage = this.handlePortMessage.bind(this);

    this.sharedBufferWorker.postMessage({ message: "INITIALIZE_WORKER" });
  }

  private sharedBufferWorker: Worker;

  public handleWorkerMessage(event: MessageEvent) {
    const data = event.data;
    if (data.message === "BUFFER_WORKER_READY") {
      // Send SharedArrayBuffers to the processor.
      this.port.postMessage(data.SharedBuffers);

      this.onInitialized();
    }
  }

  public handlePortMessage(event: MessageEvent) {
    const data = event.data;
    if (data.message === "PROCESSOR_READY") {
      this.onInitialized();
    }
  }

  // you should override this method in your calling
  // you should attach the audio processing pipeline here
  public onInitialized() {
    throw new Error("Please override onInitialized in your calling class.")
  }
}
