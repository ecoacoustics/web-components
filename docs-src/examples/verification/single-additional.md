---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class - Additional Tags
---

<h2 class="grid-title">Verification Interface (Single Class - Additional Tags)</h2>

<oe-verification-grid id="verification-grid" grid-size="5">
  <oe-decision verification="true" shortcut="H" additional-tags="adult">Koala</oe-decision>
  <oe-decision verification="true" additional-tags="juvenile" shortcut="J">Koala</oe-decision>
  <oe-decision verification="true" shortcut="K" additional-tags="fledgeling">Koala</oe-decision>
  <oe-decision verification="false" shortcut="L">Not a Koala</oe-decision>

  <oe-data-source slot="data-source" for="verification-grid" src="/public/grid-items.json" local>
  </oe-data-source>
</oe-verification-grid>
