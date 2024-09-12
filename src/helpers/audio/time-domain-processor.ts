import { TIME_DOMAIN_PROCESSOR_NAME, TimeDomainProcessorMessage } from "./messages";

export default class TimeDomainProcessor extends AudioWorkletProcessor {
  private sharedBuffer!: Float32Array;

  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  public process(input: Float32Array[][]) {
    const bufferSize = input[0].length;
    const currentSample = currentFrame + bufferSize;
    const newTime = currentSample / sampleRate;

    this.updateSharedTime(newTime);

    return true;
  }

  private updateSharedTime(value: number) {
    this.sharedBuffer[0] = value;
  }

  private handleSetup(event: TimeDomainProcessorMessage) {
    const data = event.data[1];
    this.sharedBuffer = new Float32Array(data.timeBuffer);
  }

  private handleMessage(event: TimeDomainProcessorMessage) {
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

registerProcessor(TIME_DOMAIN_PROCESSOR_NAME, TimeDomainProcessor);
