---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class - Additional Tags
---

<h2 class="grid-title">Verification Interface (Multiple Classes - Additional Tags)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-verification verified="true" additional-tags="land, male" shortcut="G">Sparrow</oe-verification>
  <oe-verification verified="true" additional-tags="land, female" shortcut="H">Sparrow</oe-verification>
  <oe-verification verified="true" additional-tags="flight, male" shortcut="J">Sparrow</oe-verification>
  <oe-verification verified="true" additional-tags="flight, female" shortcut="K">Sparrow</oe-verification>
  <oe-verification verified="true" shortcut=";">Crow</oe-verification>
  <oe-verification verified="false" shortcut="'">Negative</oe-verification>
  <oe-verification verified="true" shortcut="'">Confirmed</oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
