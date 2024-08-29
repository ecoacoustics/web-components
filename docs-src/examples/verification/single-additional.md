---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class - Additional Tags
---

<h2 class="grid-title">Verification Interface (Single Class - Additional Tags)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-verification verified="true" shortcut="H" additional-tags="adult"></oe-verification>
  <oe-verification verified="true" shortcut="J" additional-tags="juvenile"></oe-verification>
  <oe-verification verified="true" shortcut="K" additional-tags="fledgeling"></oe-verification>
  <oe-verification verified="false" shortcut="L"></oe-verification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
