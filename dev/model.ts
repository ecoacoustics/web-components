import csv from "csvtojson";

const desiredSampleRate = 32_000;

const labelsRequest = await fetch("/labels.csv");
const labelsText = await labelsRequest.text();
const labels = await csv({ flatKeys: true }).fromString(labelsText);
const labelValues = Object.values(labels);

const fileName = document.getElementById("file-name")!;
const fileInput = document.getElementById("file-input")!;
const recordButton = document.getElementById("record-button")!;
const speciesOutput = document.getElementById("species-output")!;

fileInput.addEventListener("change", async (event: any) => {
  const file = event.target.files[0];
  const arrayBuffer = await file.arrayBuffer();

  fileName.textContent = `Processing ${file.name}`;

  await processFile(arrayBuffer);

  fileName.textContent = `Finished processing ${file.name}`;
});

const userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(userMedia);
const audioChunks: BlobPart[] = [];

mediaRecorder.addEventListener("stop", async () => {
  const audioBlob = new Blob(audioChunks);
  const arrayBuffer = await audioBlob.arrayBuffer();

  fileName.textContent = `Processing recorded audio`;
  await processFile(arrayBuffer);
  fileName.textContent = `Finished processing recorded audio`;
});

mediaRecorder.addEventListener("dataavailable", (event) => {
  audioChunks.push(event.data);
});

let isRecording = false;
recordButton.addEventListener("click", async () => {
  isRecording = !isRecording;

  if (isRecording) {
    recordButton.textContent = "Stop Recording";
    mediaRecorder.start();
  } else {
    recordButton.textContent = "Record";
    mediaRecorder.stop();
  }
});

async function processFile(buffer: ArrayBuffer) {
  const session = await ort.InferenceSession.create("/perch_v2.onnx");

  const audioCtx = new AudioContext({ sampleRate: desiredSampleRate });
  const audioBuffer = await audioCtx.decodeAudioData(buffer);

  const subData = cutAudioFile(audioBuffer);

  // prepare inputs. a tensor need its corresponding TypedArray as data
  const data = Float32Array.from(subData);
  const inputs = new ort.Tensor("float32", data, [1, data.length]);

  // prepare feeds. use model input names as keys.
  const feeds = { inputs };

  // feed inputs and run
  const results = await session.run(feeds);

  // read from results
  console.table(results);
  const scores = Array.from(results.label.data as number[]);
  const indexed = scores.map((score, idx) => ({ idx, score }));
  indexed.sort((a, b) => b.score - a.score);
  const topN = 10;
  const top = indexed.slice(0, topN);

  const topLabels = top.map(({ idx, score }) => {
    const lv = labelValues[idx];
    const name = typeof lv === "object" ? Object.values(lv)[0] : String(lv);
    return `${name}: ${score.toFixed(6)}`;
  });

  const topLabelValue = topLabels.join("\n");
  speciesOutput.textContent = topLabelValue;
}

const audioDuration = 5;

/**
 * Cuts an audio file to 5 seconds and processes it
 */
function cutAudioFile(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const firstChannelData = buffer.getChannelData(0);

  console.table({ length, sampleRate });

  // if the audio is less than 5 seconds, we pad it with zeros
  const desiredLength = sampleRate * audioDuration;
  let subData: Float32Array;
  if (length >= desiredLength) {
    // if the audio is more than 5 seconds, we take the first 5 seconds
    subData = firstChannelData.slice(0, desiredLength);
  } else {
    // pad with zeros
    subData = new Float32Array(desiredLength);
    subData.set(firstChannelData, 0);
  }

  return subData;
}

async function init() {
  const initialFile = "/example.flac";
  fileName.textContent = initialFile;

  const audioFile = await fetch(initialFile);
  const buffer = await audioFile.arrayBuffer();

  processFile(buffer);
}

init();
