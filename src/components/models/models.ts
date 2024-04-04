// // if a user supplies an original recording an an audio segment it can be used to indicate that the recording is not the whole thing
// interface OriginalRecording {
//   duration: number;
// }

// interface AudioSegment {
//   startOffset: number;
// }

// type OriginalAudioRecording = OriginalRecording & AudioSegment;

// interface Audio {
//     // if duration of the media element, it will use the duration of the media element
//   duration: number;
//   sampleRate: number;
//   audio: Blob;
//   originalAudioRecording?: OriginalAudioRecording;
// }

// interface TwoDSlice {
//     x0: number;
//     x1: number;
//     y0: number;
//     y1: number;
// }

// interface Spectrogram {
//   startOffset: number;
//   endOffset: number;
// }

// also consider: SpectrogramRenderSlice
interface RenderWindow {
  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;
}

// interface RenderCanvasSize {
//   width: number;
//   height: number;
// }

// interface Annotation {
//   startOffset: number;
//   endOffset: number;
//   lowFrequency: number;
//   highFrequency: number;
//   tags: Tag[];
//   reference: object;
//   validations: Validation[];
// }

// interface Tag {
//   text: string;
//   reference: object;
// }

// interface Validation {
//   target: Tag;
//   confirmed: boolean;

//   // points to a domain model with user ids
//   reference: object;
// }

// class UnitConverters {
//     public static getRenderWindow(slice: TwoDSlice, audio: Audio): RenderWindow {
//         return new RenderWindow({
//             startOffset: UnitConverters.pixelsToSeconds(audio, slice.x0),
//             endOffset: UnitConverters.pixelsToSeconds(audio, slice.x1),
//             lowFrequency: UnitConverters.pixelsToHertz(audio, slice.y0),
//             highFrequency: UnitConverters.pixelsToHertz(audio, slice.y1),
//             x0: slice.x0,
//             x1: slice.x1,
//             y0: slice.y0,
//             y1: slice.y1,
//         });
//     }

//     public static secondsToPixels(audio: Audio) {
//         const sampleRate = audio.sampleRate;
//     }

//     public static pixelsToSeconds(audio: Audio, pixels: number): number {}

//     public static pixelsToHertz(audio: Audio, pixels: number): number {}

//     public static nyquist(audio: Audio) {
//         return audio.sampleRate / 2;
//     }
// }
