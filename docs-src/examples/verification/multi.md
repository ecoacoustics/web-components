---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class
---

<h2 class="grid-title">Verification Interface (Multiple Classes)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-verification verified="true" shortcut="H">Koala</oe-verification>
  <oe-verification verified="true" shortcut="J">Car</oe-verification>
  <oe-verification verified="true" shortcut="J">Bear</oe-verification>
  <oe-verification verified="false" shortcut="L">Negative</oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
