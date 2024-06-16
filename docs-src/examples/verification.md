---
layout: layouts/default.11ty.js
title: Open Ecoacoustics | Examples | Verification Interface (fake)
---

## Verification Interface (fake)

This example tried to mimic what a minimal implementation of a verification interface could look like using the web components.

<div>
  <div id="verification-grid"></div>

  <div class="action-group">
    <div class="action-group-description">Do all of these recordings contain a
      <span class="classification-text">Noisy Miner</span>
    </div>
    <div class="action-group-buttons">
      <button class="btn btn-lg btn-primary" onclick="nextPage();">Yes</button>
      <button class="btn btn-lg btn-outline-danger" onclick="nextPage();">No</button>
    </div>
  </div>
</div>

<script>
let nextPage;

(() => {
class GridItem {
  constructor(data) {
    Object.assign(this, data);
  }

  Filename;
  FileId;
  Datetime;
  Site;
  Subsite;
  SiteId;
  Offset;
  AudioLink;
  Distance;
}

/** @type {GridItem[]} */
let gridItems = [];

const itemsPerPage = 8;
let page = 0;

function initGridItems() {
  const itemsEndpoint = "/public/grid-items.json";
  fetch(itemsEndpoint)
    .then(async (response) => {
      const responseItems = await response.json()

      gridItems = responseItems.map((data) =>
        new GridItem(data)
      )
    })
    .then(() => {
      createverificationGrid(0)
    });
}

/**
 * @param {Number} page
 */
function createverificationGrid(page) {
  const verificationGridElement = document.getElementById("verification-grid");

  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const pageItems = gridItems.slice(startIndex, endIndex);

  for (const item of pageItems) {
    const spectrogramElement = Spectrogram(item);
    verificationGridElement.appendChild(spectrogramElement);
  }
}

nextPage = () => {
  const verificationGridElement = document.getElementById("verification-grid");
  verificationGridElement.replaceChildren();

  createverificationGrid(++page);
}

/**
 * @param {typeof GridItem} model
 * @returns {HTMLElement}
 */
function Spectrogram(item) {
  const element = document.createElement("oe-spectrogram");
  element.className = "verification-grid-item";
  element.setAttribute("src", item.AudioLink);

  return element;
}

window.addEventListener("load", () => initGridItems());
})();
</script>

<style>
.verification-grid {
  display: flex;
  flex-wrap: wrap;
}

.verification-grid-item {
  padding: 0.5rem;
}

.action-group-description {
  padding: 1rem;
  font-size: 1.2rem;
  text-align: center;
}

.classification-text {
  font-weight: bold;
}

.action-group-buttons {
  display: flex;
  justify-content: center;
  align-items: center;

  & > button {
    margin-right: 0.5rem;
    margin-left: 0.5rem;
  }
}
</style>
