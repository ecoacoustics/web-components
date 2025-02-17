---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class - Additional Tags
---

<h2 class="grid-title">Verification Interface (Multiple Classes - Additional Tags)</h2>

<oe-verification-grid id="verification-grid" grid-size="8">
  <oe-verification verified="true" shortcut="y"></oe-verification>
  <oe-verification verified="true" additional-tags="land, male" shortcut="g"></oe-verification>
  <oe-verification verified="true" additional-tags="land, female" shortcut="h"></oe-verification>
  <oe-verification verified="true" additional-tags="flight, male" shortcut="j"></oe-verification>
  <oe-verification verified="true" additional-tags="flight, female" shortcut="k"></oe-verification>
  <oe-verification verified="false" shortcut="n"></oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/kaleidoscope.csv" local>
  </oe-data-source>
</oe-verification-grid>
