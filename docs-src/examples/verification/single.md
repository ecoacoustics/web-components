---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class
---

<h2 class="grid-title">Verification Interface (Single Class)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <template>
    <oe-axes>
      <oe-indicator>
        <oe-spectrogram id="spectrogram" color-map="audacity"></oe-spectrogram>
      </oe-indicator>
    </oe-axes>
    <oe-media-controls for="spectrogram"></oe-media-controls>
    <oe-info-card></oe-info-card>
  </template>

<oe-decision value="true" tag="koala" shortcut="J">Koala</oe-decision>
<oe-decision value="false" tag="koala" shortcut="K">Not a Koala</oe-decision>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
