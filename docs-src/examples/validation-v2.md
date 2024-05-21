---
layout: example.11ty.js
title: Open Ecoacoustics | Examples | Validation Interface (Real)
---

## Validation Interface (Using Real Verification Component)

This example uses a real `oe-verification-grid` component to show how to use the
web components to validate events in an audio recording.

```html
<oe-verification-grid id="verification-grid" src="/grid-items.json" key="AudioLink" grid-size="6">
  <template>
    <div style="position: relative;">
      <oe-axes style="padding: 2rem;">
        <oe-indicator>
          <oe-spectrogram id="spectrogram" color-map="raven"></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-media-controls
        class="media-controls"
        for="spectrogram"
        style="position: absolute; top: 3rem; right: 3rem; border-radius: 9999em; z-index: 99; padding: 0px; zoom: 0.75;"
      ></oe-media-controls>
    </div>
  </template>

  <div>
    <h3 style="text-align: center;">Are all of these a Koala?</h3>
    <div style="display: flex; justify-content: center; align-items: center;">
      <oe-decision value="true" tag="koala" shortcut="J">Koala</oe-decision>
      <oe-decision value="false" tag="koala" shortcut="K">Not a Koala</oe-decision>
    </div>
  </div>
</oe-verification-grid>
```

<oe-verification-grid id="verification-grid" src="/grid-items.json" key="AudioLink" grid-size="6">
  <template>
    <div style="position: relative;">
      <oe-axes style="padding: 2rem;">
        <oe-indicator>
          <oe-spectrogram id="spectrogram" color-map="raven"></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-media-controls class="media-controls" for="spectrogram"
        style="position: absolute; top: 3rem; right: 3rem; border-radius: 9999em; z-index: 99; padding: 0px; zoom: 0.75;"></oe-media-controls>
    </div>
  </template>

  <div>
    <h3 style="text-align: center;">Are all of these a Koala?</h3>
    <div style="display: flex; justify-content: center; align-items: center;">
      <oe-decision value="true" tag="koala" shortcut="J">Koala</oe-decision>
      <oe-decision value="false" tag="koala" shortcut="K">Not a Koala</oe-decision>
    </div>
  </div>
</oe-verification-grid>

<output id="decision-output">
</output>

<script>
(() => {
const verificationGrid = document.getElementById("verification-grid");
const outputElement = document.getElementById("decision-output");

function outputDecision(x) {
  const element = document.createElement("pre");
  element.innerText = JSON.stringify(x.detail);
  element.style.display = "block";

  outputElement.appendChild(element);
}

verificationGrid.addEventListener("decision-made", (x) => outputDecision(x));
})();
</script>
