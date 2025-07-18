---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class
---

<h2 class="grid-title">Verification Interface (Multiple Classes)</h2>

<oe-verification-grid id="verification-grid" grid-size="8">
  <oe-verification verified="true" shortcut="Y"></oe-verification>
  <oe-verification verified="false" shortcut="N"></oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/kaleidoscope.csv" local></oe-data-source>
</oe-verification-grid>
