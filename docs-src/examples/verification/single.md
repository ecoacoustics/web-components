---
layout: verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class
---

## Verification Interface (Single Class)

<oe-verification-grid id="verification-grid" src="/grid-items.json" grid-size="5">
  <template>
    <div style="position: relative;">
      <oe-axes>
        <oe-indicator>
          <oe-spectrogram id="spectrogram" color-map="audacity"></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-info-card></oe-info-card>
      <oe-media-controls class="media-controls" for="spectrogram"
        style="position: absolute; top: 1rem; right: 2rem; border-radius: 9999em; z-index: 99; padding: 0px; zoom: 0.5;"></oe-media-controls>
    </div>
  </template>
  <oe-decision value="true" tag="koala" shortcut="J">Koala</oe-decision>
  <oe-decision value="false" tag="koala" shortcut="K">Not a Koala</oe-decision>
</oe-verification-grid>
