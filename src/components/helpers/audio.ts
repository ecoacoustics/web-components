export class AudioHelper {
  static generateFft() {}

  static connect(audioElement: HTMLAudioElement) {
    const context = new OfflineAudioContext({
      numberOfChannels: 1,
      length: 5 * 22050,
      sampleRate: 22050,
    });

    context.onstatechange = (event) => {
      console.log("change", event, context);
    };

    context.oncomplete = (event) => {
      console.log("complete", event, context);
    };

    const bufferSource = context.createBufferSource();

    let analyzer: any;
    // const analyzer = context.createAnalyser();
    // analyzer.fftSize = 4096;

    // const bufferSize = (audioElement.duration * context.sampleRate) / 22050;
    const output = new Float32Array(256);

    let source: any;

    // TODO: see if there is a better way to do this
    // TODO: probably use web codec (AudioDecoder) for decoding partial files
    fetch(audioElement.src)
      .then((response) => response.arrayBuffer())
      .then((downloadedBuffer) => context.decodeAudioData(downloadedBuffer))
      .then((decodedBuffer) => {
        source = new AudioBufferSourceNode(context, { buffer: decodedBuffer });
      })
      .then(() => context.audioWorklet.addModule("src/components/helpers/fft-processor.js"))
      .then(() => {
        // bufferSource.buffer = decodedBuffer;
        // source.connect(context.input);

        analyzer = new AnalyserNode(context, { fftSize: 512 });

        // const javascriptNode = context.createScriptProcessor(256, 1, 1);
        // javascriptNode.onaudioprocess = () => {
        //   analyzer.getFloatTimeDomainData(output);
        //   console.log(output);
        // };

        const javascriptNode = new AudioWorkletNode(context, "fft-processor");

        source.connect(context.destination);
        source.connect(analyzer);
        analyzer.connect(javascriptNode);
        javascriptNode.connect(context.destination);

        console.log(javascriptNode, context.audioWorklet);

        return source.start();
      })
      .then(() => context.startRendering());
  }
}
