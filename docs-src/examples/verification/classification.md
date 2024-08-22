---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Multiple Class
---

<h2 class="grid-title">Verification Interface (Multiple Classes)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-classification tag="koala" verified="true" shortcut="H">Koala</oe-classification>
  <oe-classification tag="koala" verified="false" shortcut="J">Not Koala</oe-classification>
  <oe-classification tag="car" shortcut="K">Car</oe-classification>
  <oe-classification tag="car" verified="false" shortcut="L">Not Car</oe-classification>
  <oe-classification tag="crickets" shortcut="Q">Crickets</oe-classification>
  <oe-classification tag="crickets" verified="false" shortcut="W">Not Crickets</oe-classification>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
