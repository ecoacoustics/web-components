import { Size } from "../../models/rendering";
import { IAudioInformation, SpectrogramOptions } from "./models";

export const BUFFER_PROCESSOR_NAME = "buffer-builder-processor";

export type NamedMessageData<TMessage, TData> = [name: TMessage, data: TData];
export type Generation = { generation: number };
export type SharedBuffers = { state: SharedArrayBuffer; sampleBuffer: SharedArrayBuffer };

// processor

export type SharedBuffersWithGeneration = SharedBuffers & Generation;

export type ProcessorSetupMessage = NamedMessageData<"setup", SharedBuffersWithGeneration>;
export type ProcessorMessage = MessageEvent<ProcessorSetupMessage>;

// worker

export type GenerationMetadata = Generation & { audioInformation: IAudioInformation; options: SpectrogramOptions };
export type SharedBuffersWithCanvas = SharedBuffers & { canvas: OffscreenCanvas };

export type WorkerSetupMessage = NamedMessageData<"setup", SharedBuffersWithCanvas>;
export type WorkerResizeCanvasMessage = NamedMessageData<"resize-canvas", Size>;
export type WorkerRegenerateSpectrogramMessage = NamedMessageData<"regenerate-spectrogram", GenerationMetadata>;

export type WorkerMessage = MessageEvent<
  WorkerSetupMessage | WorkerResizeCanvasMessage | WorkerRegenerateSpectrogramMessage
>;
