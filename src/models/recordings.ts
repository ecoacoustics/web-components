import { Hertz, Seconds } from "./unitConverters";

export type OriginalAudioRecording = OriginalRecording & AudioSegment;

// if a user supplies an original recording an an audio segment it can be used to indicate that the recording is not the whole thing
export class OriginalRecording {
  public constructor(duration: Seconds) {
    this.duration = duration;
  }

  public duration: Seconds;
}

export class AudioSegment {
  public constructor(startOffset: Seconds) {
    this.startOffset = startOffset;
  }

  public startOffset: Seconds;
}

export class AudioModel {
  public constructor(duration: Seconds, sampleRate: Hertz, originalAudioRecording?: OriginalAudioRecording) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.originalAudioRecording = originalAudioRecording;
  }

  public duration: Seconds;
  public sampleRate: Hertz;
  public originalAudioRecording?: OriginalAudioRecording;
}
