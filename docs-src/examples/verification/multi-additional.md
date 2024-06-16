---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class - Additional Tags
---

## Verification Interface (Multiple Classes - Additional Tags)

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
  <oe-decision value="true" tag="koala" additional-tags="land, male" shortcut="G">Sparrow</oe-decision>
  <oe-decision value="true" tag="koala" additional-tags="land, female" shortcut="H">Sparrow</oe-decision>
  <oe-decision value="true" tag="koala" additional-tags="flight, male" shortcut="J">Sparrow</oe-decision>
  <oe-decision value="true" tag="koala" additional-tags="flight, female" shortcut="K">Sparrow</oe-decision>
  <oe-decision value="true" tag="bear" shortcut=";">Crow</oe-decision>
  <oe-decision value="false" tag="*" shortcut="'">Negative</oe-decision>
  <oe-decision value="true" tag="*" shortcut="'">Confirmed</oe-decision>
</oe-verification-grid>