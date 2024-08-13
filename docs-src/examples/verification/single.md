---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class
---

<h2 class="grid-title">Verification Interface (Single Class)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-verification verified="true" shortcut="J">Koala</oe-verification>
  <oe-verification verified="false" shortcut="K">Not a Koala</oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
