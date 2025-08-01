---
layout: layouts/verification.11ty.js
title: Open Ecoacoustics | Examples | Verification | Single Class - Dark Mode
---

<h2 class="grid-title">Verification Interface (Single Class - Dark Mode)</h2>

<oe-verification-grid id="verification-grid" grid-size="8">
  <oe-verification verified="true" shortcut="Y"></oe-verification>
  <oe-verification verified="false" shortcut="N"></oe-verification>
  <oe-data-source slot="data-source" for="verification-grid" src="/public/kaleidoscope.csv" local></oe-data-source>
</oe-verification-grid>

<style>
  :root {
    --oe-theme-hue: 59deg !important;
    --oe-theme-saturation: 82.1% !important;
    --oe-theme-lightness: 51.8% !important;

    --oe-font-color: #fff !important;
    --oe-background-color: rgb(88, 88, 90) !important;

    --oe-selected-color: rgba(255, 255, 255, 0.1) !important;

    --oe-info-bg-color: transparent !important;

    --oe-panel-color: rgb(88, 88, 90) !important;

    --oe-border-rounding: 0.2rem !important;

    /* Disable the box shadow */
    --oe-box-shadow: none;

    --sl-color-neutral-0: rgb(45, 45, 46) !important;
    --sl-color-neutral-100: rgb(88, 88, 90) !important;
    --sl-color-neutral-700: white !important;
    --sl-color-neutral-1000: white !important;
  }
</style>
