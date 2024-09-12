import { HIGH_ACCURACY_TIME_PROCESSOR_NAME, HighAccuracyTimeProcessorMessage } from "./messages";

export default class HighAccuracyTimeProcessor extends AudioWorkletProcessor {
  private sharedBuffer!: Float32Array;

  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  public process(input: Float32Array[][]) {
    // we can calculate how much time the audio worklet has processed by
    // looking at how many audio samples has processed and divide it by the
    // sample rate
    // because the currentFrame is the index of the first audio sample in the
    // input buffer, we add the buffer size to so that we get time processed
    // of the last item in the buffer
    const bufferSize = input[0].length;
    const currentSample = currentFrame + bufferSize;
    const timeProcessed = currentSample / sampleRate;

    this.updateSharedTime(timeProcessed);

    return true;
  }

  /**
   * Updates SharedArrayBuffer's current time, allowing other threads to
   * read the new high accuracy time.
   */
  private updateSharedTime(value: number) {
    this.sharedBuffer[0] = value;
  }

  private handleSetup(event: HighAccuracyTimeProcessorMessage) {
    const data = event.data[1];
    this.sharedBuffer = new Float32Array(data.timeBuffer);
  }

  private handleMessage(event: HighAccuracyTimeProcessorMessage) {
    switch (event.data[0]) {
      case "setup": {
        this.handleSetup(event);
        break;
      }

      default:
        throw new Error("Unknown message type");
    }
  }
}

registerProcessor(HIGH_ACCURACY_TIME_PROCESSOR_NAME, HighAccuracyTimeProcessor);
