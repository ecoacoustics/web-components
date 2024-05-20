---
layout: example.11ty.js
title: Open Ecoacoustics | Examples | Validation Interface (Real)
---

## Validation Interface (Using Real Verification Component)

This example uses a real `oe-verification-grid` component to show how to use the
web components to validate events in an audio recording.

```html
<oe-verification-grid src="/grid-items.json" key="AudioLink" grid-size="6">
  <template>
    <oe-spectrogram color-map="raven"></oe-spectrogram>
  </template>

  <h3 style="text-align: center;">Are all of these a Koala?</h3>
  <div style="display: flex; justify-content: center; align-items: center;">
    <oe-decision value="verified" tag="koala" shortcut="J">Koala (J)</oe-decision>
    <oe-decision value="not-verified" tag="koala" shortcut="K">Not a Koala (K)</oe-decision>
  </div>
</oe-verification-grid>
```

<oe-verification-grid src="/grid-items.json" key="AudioLink" grid-size="6">
  <template>
    <oe-spectrogram color-map="raven"></oe-spectrogram>
  </template>

  <h3 style="text-align: center;">Are all of these a Koala?</h3>
  <div style="display: flex; justify-content: center; align-items: center;">
    <oe-decision value="verified" tag="koala" shortcut="J">Koala (J)</oe-decision>
    <oe-decision value="not-verified" tag="koala" shortcut="K">Not a Koala (K)</oe-decision>
  </div>
</oe-verification-grid>
