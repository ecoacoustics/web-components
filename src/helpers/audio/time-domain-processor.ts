import { Float32Tuple } from "../types/advancedTypes";
import { TIME_DOMAIN_PROCESSOR_NAME, TimeDomainProcessorMessage } from "./messages";

export default class TimeDomainProcessor extends AudioWorkletProcessor {
  private sharedBuffer: Float32Tuple = new Float32Array(1);
  private sampleRate?: number;

  public constructor() {
    super();

    this.port.onmessage = this.handleMessage.bind(this);
  }

  public process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (!this.sampleRate) {
      console.error("Sample rate has not been initialized");
      return false;
    }

    outputs[0] = inputs[0];

    const derivedTime = self.currentFrame / this.sampleRate;
    this.sharedBuffer[0] = derivedTime;

    return true;
  }

  private handleSetup(event: TimeDomainProcessorMessage) {
    this.sampleRate = event.data[1].sampleRate;
    this.sharedBuffer = event.data[1].timeBuffer;
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
