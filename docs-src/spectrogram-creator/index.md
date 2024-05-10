---
layout: example.11ty.js
title: Webcomponents Workspace ⌲ Spectrogram Creator
---

# Spectrogram Creator

```html
<oe-axes>
<oe-indicator>
<oe-spectrogram id="playing-spectrogram" src="/example.flac"></oe-spectrogram>
</oe-indicator>
</oe-axes>
<oe-media-controls for="playing-spectrogram"></oe-media-controls>
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
                    <option value="hann" selected>Hann</option>
                    <option value="hamming">Hamming</option>
                    <option value="lanczos">Lanczos</option>
                    <option value="gaussian">Gaussian</option>
                    <option value="tukey">Tukey</option>
                    <option value="blackman">Blackman</option>
                    <option value="exact-blackman">Exact Blackman</option>
                    <option value="blackman-harris">Blackman Harris</option>
                    <option value="backman-nuttall">Blackman Nuttall</option>
                    <option value="kaiser">Kaiser</option>
                    <option value="flat-top">Flat Top</option>
                </select>
            </label>
            <label>
                Window Size
                <select class="form-select" onchange="updateAttribute('window-size', event.target.value)">
                    <option value="128">128</option>
                    <option value="256">256</option>
                    <option value="512" selected>512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                </select>
            </label>
            <label>
                Window Overlap
                <select class="form-select" onchange="updateAttribute('window-overlap', event.target.value)">
                    <option value="0">None</option>
                    <option value="128" selected>128</option>
                    <option value="256">256</option>
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                </select>
            </label>
            <label>
                Color Map
                <select class="form-select" onchange="updateAttribute('color-map', event.target.value)">
                    <option value="grayscale">Grayscale</option>
                    <option value="audacity" selected>Audacity</option>
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
                Brightness
                <input
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
                    type="number"
                    value="1"
                    step="0.05"
                    class="form-control"
                    onchange="updateAttribute('contrast', Number(event.target.value))"
                />
            </label>
        </div>
    </div>
</div>

<script>
let spectrogramElement = null;

window.onload = () => {
    spectrogramElement = document.getElementById("playing-spectrogram");
};

function updateAttribute(attribute, value) {
    spectrogramElement.setAttribute(attribute, value);

    // update the code that can be copied
    const codeInputElement = document.getElementById("spectrogram-output");
    const codeOutputElement = document.getElementsByTagName("pre")[0];

    console.log(codeInputElement);
    codeOutputElement.innerText = codeInputElement.innerHTML.trim().replace(/^[\s]*/gm, "");
}
</script>

<style>
label {
    display: block;
    padding-bottom: 1rem;
}

oe-spectrogram {
    position: relative;
    width: 400px;
    height: 300px;
}
</style>
