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
            window-overlap="0"
          ></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-media-controls for="playing-spectrogram"></oe-media-controls>
    </div>
    <div class="col">
      <label>
        Window Function
        <select
          id="window-function-input"
          class="form-select"
          onchange="updateAttribute('window-function', event.target.value)"
        >
          <option value="">None</option>
          <option value="hann">Hann</option>
          <option value="hamming">Hamming</option>
          <option value="cosine">Cosine</option>
          <option value="lanczos">Lanczos</option>
          <option value="gaussian">Gaussian</option>
          <option value="tukey">Tukey</option>
          <option value="blackman">Blackman</option>
          <option value="exact_blackman">Exact Blackman</option>
          <option value="kaiser">Kaiser</option>
          <option value="nutall">Nutall</option>
          <option value="blackman_harris">Blackman Harris</option>
          <option value="blackman_nuttall">Blackman Nuttall</option>
          <option value="flat_top">Flat Top</option>
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
          <option value="512">512</option>
          <option value="1024">1024</option>
          <option value="2048">2048</option>
          <option value="4096">4096</option>
          <option value="8192">8192</option>
          <option value="16384">16384</option>
          <option value="32768">32768</option>
        </select>
      </label>
      <label>
        Window Overlap
        <select
          id="window-overlap-input"
          class="form-select"
          onchange="updateAttribute('window-overlap', event.target.value)"
        >
          <option value="0">0</option>
          <option value="128">128</option>
          <option value="256">256</option>
        </select>
      </label>
      <label>
        Color Map
        <select
          id="color-map-input"
          class="form-select"
          onchange="updateAttribute('color-map', event.target.value)"
        >
          <option value="grayscale">Grayscale</option>
          <option value="audacity">Audacity</option>
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
        <select
          id="mel-scale-input"
          class="form-select"
          onchange="booleanAttribute('mel-scale', event.target.value)"
        >
          <option value="false">Linear</option>
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
        <select
          id="src-input"
          class="form-select"
          onchange="updateAttribute('src', event.target.value)"
        >
          <option value="/public/example_1s.wav">1 second .wav</option>
          <option value="/public/example.flac">5 second .flac</option>
          <option value="/public/example2.flac">5 second (alternative) .flac</option>
          <option value="/public/example_34s.flac">34 second .flac</option>
        </select>
      </label>
    </div>
  </div>
</div>

<script>
window.onload = () => {
  setup();
};

// components
const spectrogram = () => document.getElementById("playing-spectrogram");

// dropdowns
const windowSizeInput = () => document.getElementById("window-size-input");
const windowOverlapInput = () => document.getElementById("window-overlap-input");
const windowFunctionInput = () => document.getElementById("window-function-input");
const melScaleInput = () => document.getElementById("mel-scale-input");
const colorMapInput = () => document.getElementById("color-map-input");
const spectrogramSourceInput = () => document.getElementById("src-input");

// input boxes
const brightnessInput = () => document.getElementById("brightness-input");
const contrastInput = () => document.getElementById("contrast-input");

function setup() {
  spectrogram().addEventListener("loaded", () => updateCodeExample());
  spectrogram().addEventListener("options-change", (newOptions) => updateInputs(newOptions.detail));

  // WARNING: HACKY CODE / WORKAROUND AHEAD
  //
  // using the html "selected" attribute can sometimes be faulty
  // e.g. On FireFox if you reload the page (without hard-reload), the dropdown
  // elements will still have the same selected option before the page reload
  // but the onchange event will not fire
  // this can cause the spectrograms options to be different from the values
  // displayed in the select element dropdowns
  const defaultDemoSpectrogramOptions = {
    windowSize: 512,
    windowOverlap: 0,
    windowFunction: "hann",
    colorMap: "audacity",
    melScale: false,
    brightness: 0,
    contrast: 1,
  };

  updateInputs(defaultDemoSpectrogramOptions);

  updateSelectedDropdown(spectrogramSourceInput(), "/public/example.flac");
}

function updateInputs(options) {
  updateSelectedDropdown(windowOverlapInput(), options.windowOverlap);

  updateWindowSize(options.windowSize);
  updateSelectedDropdown(windowSizeInput(), options.windowSize);

  updateSelectedDropdown(windowFunctionInput(), options.windowFunction);
  updateSelectedDropdown(melScaleInput(), options.melScale);
  updateSelectedDropdown(colorMapInput(), options.colorMap);

  brightnessInput().value = options.brightness;
  contrastInput().value = options.contrast;
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

  updateAttribute("window-size", windowSize);
}

function setMaximumWindowOverlap(maximum) {
  const overlapInputInstance = windowOverlapInput();
  const currentOverlap = Number(overlapInputInstance.value);

  // set the innerHTML to an empty string to remove all the outdated options
  overlapInputInstance.innerHTML = "";
  
  const candidateOverlaps = [0, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
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
  spectrogram().setAttribute(attribute, value);
  updateCodeExample();
}

function booleanAttribute(attribute, show) {
  const shouldShow = show === "true";

  if (shouldShow) {
    spectrogram().setAttribute(attribute, "");
  } else {
    spectrogram().removeAttribute(attribute);
  }
}

function updateSelectedDropdown(target, value) {
  const dropdownOptions = target.querySelectorAll("option");

  for (const element of dropdownOptions) {
    element.selected = element.value.toString() === value.toString();
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
