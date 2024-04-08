export type OriginalAudioRecording = OriginalRecording & AudioSegment;

// if a user supplies an original recording an an audio segment it can be used to indicate that the recording is not the whole thing
export class OriginalRecording {
  public constructor(data: OriginalRecording) {
    this.duration = data.duration;
  }

  duration: number;
}

export class AudioSegment {
  public constructor(data: AudioSegment) {
    this.startOffset = data.startOffset;
  }

  startOffset: number;
}

export class AudioModel {
  public constructor(data: AudioModel) {
    this.duration = data.duration;
    this.sampleRate = data.sampleRate;
    this.originalAudioRecording = data.originalAudioRecording;
  }

  duration: number;
  sampleRate: number;
  originalAudioRecording?: OriginalAudioRecording;
}
