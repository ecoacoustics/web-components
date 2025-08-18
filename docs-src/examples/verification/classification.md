---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Classification
---

<h2 class="grid-title">Classification Interface</h2>

<oe-verification-grid id="verification-grid" grid-size="8">
  <oe-classification tag="koala" true-shortcut="h"></oe-classification>
  <oe-classification tag="car" true-shortcut="j"></oe-classification>
  <oe-classification tag="crickets" true-shortcut="k"></oe-classification>
  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local></oe-data-source>
</oe-verification-grid>
