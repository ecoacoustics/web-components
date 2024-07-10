---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class - Additional Tags
---

<h2 class="grid-title">Verification Interface (Multiple Classes - Additional Tags)</h2>

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

<oe-decision value="true" tag="koala" additional-tags="land, male" shortcut="G">Sparrow</oe-decision>
<oe-decision value="true" tag="koala" additional-tags="land, female" shortcut="H">Sparrow</oe-decision>
<oe-decision value="true" tag="koala" additional-tags="flight, male" shortcut="J">Sparrow</oe-decision>
<oe-decision value="true" tag="koala" additional-tags="flight, female" shortcut="K">Sparrow</oe-decision>
<oe-decision value="true" tag="bear" shortcut=";">Crow</oe-decision>
<oe-decision value="false" tag="*" shortcut="'">Negative</oe-decision>
<oe-decision value="true" tag="*" shortcut="'">Confirmed</oe-decision>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
