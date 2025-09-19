import { Sample, Hertz, Seconds } from "../../models/unitConverters";

export interface AudioInformation {
  startSample: Sample;
  endSample: Sample;
  sampleRate: Hertz;
  channels: number;
  duration: Seconds;
}
