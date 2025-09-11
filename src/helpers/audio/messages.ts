import { Size } from "../../models/rendering";
import { SpectrogramOptions } from "../../components/spectrogram/spectrogramOptions";
import { AudioInformation } from "./audioInformation";

export const BUFFER_PROCESSOR_NAME = "buffer-builder-processor";
export const HIGH_ACCURACY_TIME_PROCESSOR_NAME = "high-accuracy-time-processor";

export type NamedMessageData<TMessage, TData> = [name: TMessage, data: TData];
export type Generation = { generation: number };
export type SharedBuffers = { state: SharedArrayBuffer; sampleBuffer: SharedArrayBuffer };

// FFT buffer builder processor

export type SharedBuffersWithGeneration = SharedBuffers & Generation;

export type ProcessorSetupMessage = NamedMessageData<"setup", SharedBuffersWithGeneration>;
export type ProcessorMessage = MessageEvent<ProcessorSetupMessage>;

// worker

export type GenerationMetadata = Generation & { audioInformation: AudioInformation; options: SpectrogramOptions };
export type SharedBuffersWithCanvas = SharedBuffers & { canvas: OffscreenCanvas };

export type WorkerSetupMessage = NamedMessageData<"setup", SharedBuffersWithCanvas>;
export type WorkerResizeCanvasMessage = NamedMessageData<"resize-canvas", Size>;
export type WorkerRegenerateSpectrogramMessage = NamedMessageData<"regenerate-spectrogram", GenerationMetadata>;
export type WorkerClearCanvasMessage = NamedMessageData<"clear-canvas", never>;

export type WorkerMessage = MessageEvent<
  WorkerSetupMessage | WorkerResizeCanvasMessage | WorkerRegenerateSpectrogramMessage | WorkerClearCanvasMessage
>;

// high accuracy time processor

export type HighAccuracyTimeSharedState = { timeBuffer: SharedArrayBuffer };
export type HighAccuracyTimeProcessorSetupMessage = NamedMessageData<"setup", HighAccuracyTimeSharedState>;
export type HighAccuracyTimeProcessorMessage = MessageEvent<HighAccuracyTimeProcessorSetupMessage>;
