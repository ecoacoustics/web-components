---
layout: layouts/default.11ty.js
title: Open Ecoacoustics Web Components | Spectrogram Creator
---

<script src="/deps/prism-core.min.js"></script>
<script src="/deps/prism-markup.min.js"></script>
<script src="/deps/prism-autoloader.min.js"></script>

## Spectrogram Creator

```html
Loading...
```

<div class="container">
  <div class="row">
    <div id="spectrogram-output" class="col">
      <oe-axes>
        <oe-indicator>
          <oe-spectrogram
            id="playing-spectrogram"
            src="/public/example.flac"
            color-map="audacity"
            window-function="hann"
            window-size="512"
            window-overlap="128"
          ></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-media-controls for="playing-spectrogram"></oe-media-controls>
    </div>
    <div class="col">
      <label>
        Window Function
        <select class="form-select" onchange="updateAttribute('window-function', event.target.value)">
          <option value="">None</option>
          <option class="default-selected" value="hann">Hann</option>
          <option value="hamming">Hamming</option>
          <option value="lanczos">Lanczos</option>
          <option value="gaussian">Gaussian</option>
          <option value="tukey">Tukey</option>
          <option value="blackman">Blackman</option>
          <option value="exact-blackman">Exact Blackman</option>
          <option value="blackman-harris">Blackman Harris</option>
          <option value="blackman-nuttall">Blackman Nuttall</option>
          <option value="kaiser">Kaiser</option>
          <option value="flat-top">Flat Top</option>
        </select>
      </label>
      <label>
        Window Size
        <select
          id="window-size-input"
          class="form-select"
          onchange="updateWindowSize(event.target.value)"
        >
          <option value="256">256</option>
          <option class="default-selected" value="512">512</option>
          <option value="1024">1024</option>
          <option value="2048">2048</option>
        </select>
      </label>
      <label>
        Window Overlap
        <select
          id="window-overlap-input"
          class="form-select"
          onchange="updateAttribute('window-overlap', event.target.value)"
        >
          <option class="default-selected" value="0">0</option>
          <option value="128">128</option>
          <option value="256">256</option>
        </select>
      </label>
      <label>
        Color Map
        <select class="form-select" onchange="updateAttribute('color-map', event.target.value)">
          <option value="grayscale">Grayscale</option>
          <option class="default-selected" value="audacity">Audacity</option>
          <option value="raven">Raven</option>
          <option value="cubeHelix">Cube Helix</option>
          <option value="viridis">Viridis</option>
          <option value="turbo">Turbo</option>
          <option value="plasma">Plasma</option>
          <option value="inferno">Inferno</option>
          <option value="magma">Magma</option>
          <option value="gammaII">Gamma II</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="orange">Orange</option>
          <option value="purple">Purple</option>
          <option value="red">Red</option>
        </select>
      </label>
      <label>
        Scale
        <select class="form-select" onchange="booleanAttribute('mel-scale', event.target.value)">
          <option class="default-selected" value="false">Linear</option>
          <option value="true">Mel</option>
        </select>
      </label>
      <label>
        Brightness
        <input
          id="brightness-input"
          type="number"
          value="0"
          step="0.05"
          class="form-control"
          onchange="updateAttribute('brightness', Number(event.target.value))"
        />
      </label>
      <label>
        Contrast
        <input
          id="contrast-input"
          type="number"
          value="1"
          step="0.05"
          class="form-control"
          onchange="updateAttribute('contrast', Number(event.target.value))"
        />
      </label>
      <label>
        URL Source
        <select class="form-select" onchange="updateAttribute('src', event.target.value)">
          <option value="/public/example_1s.wav">1 second .wav</option>
          <option class="default-selected" value="/public/example.flac">5 second .flac</option>
          <option value="/public/example2.flac">5 second (alternative) .flac</option>
          <option value="/public/example_34s.flac">34 second .flac</option>
        </select>
      </label>
    </div>
  </div>
</div>

<script>
/*
  Known bugs on this page:
  1. If the user changes the spectrogram settings through the media controls
     input, the input boxes and code output will not update correctly
*/
window.onload = () => {
  setup();
};

const spectrogram = () => document.querySelector("oe-spectrogram");
const windowSizeInput = () => document.getElementById("window-size-input");
const windowOverlapInput = () => document.getElementById("window-overlap-input");
const brightnessInput = () => document.getElementById("brightness-input");
const contrastInput = () => document.getElementById("contrast-input");

function setup() {
  spectrogram().addEventListener("loaded", () => updateCodeExample());
  selectDefaultOptions();
}

// WARNING: HACKY CODE / WORKAROUND AHEAD
//
// using the html "selected" attribute can sometimes be faulty
// e.g. On FireFox if you reload the page (without hard-reload), the dropdown
// elements will still have the same selected option before the page reload
// but the onchange event will not fire
// this can cause the spectrograms options to be different from the values
// displayed in the select element dropdowns
function selectDefaultOptions() {
  const defaultOptions = document.getElementsByClassName("default-selected");
  for (const element of defaultOptions) {
    element.selected = true;
  }

  // this is a hack to get the number inputs set to the correct initial value
  brightnessInput().value = 0;
  contrastInput().value = 1;
}

function updateCodeExample() {
  // update the code that can be copied
  const codeInputElement = document.getElementById("spectrogram-output");
  const codeOutputElement = document.getElementsByTagName("pre")[0];
  const code = codeInputElement.innerHTML.trim().replace(/^[\s]*/gm, "");

  const highlightedCode = Prism.highlight(code, Prism.languages.html);
  codeOutputElement.innerHTML = highlightedCode;
}

// window size has its own special event handler because it has a direct
// impact on what values are allowed for the window overlap
// because the window overlap MUST be less than or equal to half of the window
// size, we might need to adjust the window overlap
function updateWindowSize(windowSize) {
  const windowSizeValue = Number(windowSize);

  const maximumOverlapValue = windowSizeValue / 2;
  setMaximumWindowOverlap(maximumOverlapValue);

  updateAttribute("window-size", event.target.value);
}

function setMaximumWindowOverlap(maximum) {
  const overlapInputInstance = windowOverlapInput();
  const currentOverlap = Number(overlapInputInstance.value);

  // set the innerHTML to an empty string to remove all the outdated options
  overlapInputInstance.innerHTML = "";
  
  const candidateOverlaps = [0, 128, 256, 512, 1024];
  const possibleOverlaps = candidateOverlaps.filter(
    (value) => value <= maximum,
  );

  // we aim to keep the currently selected overlap value, but if it is too large
  // for the new window overlap maximum, we set the new overlap to the maximum
  // possible value
  const newSelectedValue = Math.min(currentOverlap, maximum);

  for (const overlap of possibleOverlaps) {
    const optionChildElement = document.createElement("option");
    optionChildElement.value = overlap;
    optionChildElement.innerText = overlap;

    if (overlap == newSelectedValue) {
      optionChildElement.selected = true;
    }

    overlapInputInstance.appendChild(optionChildElement);
  }

  updateAttribute("window-overlap", newSelectedValue);
}

function updateAttribute(attribute, value) {
  document.getElementById("playing-spectrogram").setAttribute(attribute, value);
  updateCodeExample();
}

function booleanAttribute(attribute, show) {
  const shouldShow = show === "true";
  const spectrogram = document.getElementById("playing-spectrogram");

  if (shouldShow) {
    spectrogram.setAttribute(attribute, "");
  } else {
    spectrogram.removeAttribute(attribute);
  }
}
</script>

<style>
label {
  display: block;
  padding-bottom: 1rem;
}

oe-spectrogram {
  position: relative;

  /*
    aim for a width of 400px, but if we can't fit on the screen, clamp to the
    width of the screen
  */
  width: 400px;
  height: 400px;

  max-width: 100%;
  max-width: 100%;
}
</style>
