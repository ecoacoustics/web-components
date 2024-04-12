import * as a from "./shared-buffer-worker";
import * as b from "./shared-buffer-worklet-node";
import * as c from "./shared-buffer-worklet-processor";

export class AudioHelper {
  static generateFft() {}

  static connect(audioElement: HTMLAudioElement) {
    const context = new AudioContext({
      sampleRate: 22050,
    });

    let source: any;

    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    fetch(audioElement.src)
      .then((response) => response.arrayBuffer())
      .then((downloadedBuffer) => context.decodeAudioData(downloadedBuffer))
      .then((decodedBuffer) => {
        source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });
      })
      .then(() => {
        import("./shared-buffer-worklet-node.ts").then(({ default: SharedBufferWorkletNode }) => {
          context.audioWorklet.addModule("src/components/helpers/shared-buffer-worklet-processor.ts").then(() => {
            const sbwNode = new SharedBufferWorkletNode(context);

            sbwNode.onInitialized = () => {
              source.connect(sbwNode).connect(context.destination);
              console.log("here");
              source.start();
            };

            sbwNode.onError = (errorData) => {
              console.log("[ERROR] " + errorData.detail);
            };
          });
        });
      });
  }
}
