---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Compound
---

<h2 class="grid-title">Verification Interface (Compound Task)</h2>

<oe-verification-grid id="verification-grid" grid-size="8">
  <oe-verification verified="true" shortcut="Y"></oe-verification>
  <oe-verification verified="false" shortcut="N"></oe-verification>
  <oe-tag-prompt
    shortcut="3"
    when="(subject) => subject?.verification?.confirmed === 'false'"
    search="(fragment) => {
      const options = [{ text: 'Abbots Babbler' }, { text: 'Brush Turkey' }, { text: 'Noisy Miner' }];
      return options.filter((option) => option.text.includes(fragment));
    }"
  ></oe-tag-prompt>
  <oe-data-source slot="data-source" for="verification-grid" src="/public/kaleidoscope.csv" local></oe-data-source>
</oe-verification-grid>
