export type OriginalAudioRecording = OriginalRecording & AudioSegment;

// if a user supplies an original recording an an audio segment it can be used to indicate that the recording is not the whole thing
export class OriginalRecording {
  public constructor(duration: number) {
    this.duration = duration;
  }

  public duration: number;
}

export class AudioSegment {
  public constructor(startOffset: number) {
    this.startOffset = startOffset;
  }

  public startOffset: number;
}

export class AudioModel {
  public constructor(
    duration: number,
    sampleRate: number,
    originalAudioRecording?: OriginalAudioRecording,
  ) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.originalAudioRecording = originalAudioRecording;
  }

  public duration: number;
  public sampleRate: number;
  public originalAudioRecording?: OriginalAudioRecording;
}
