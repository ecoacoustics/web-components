---
layout: example.11ty.js
title: Open Ecoacoustics | Examples | Validation Grid
---

## Validation Interface

This example tried to mimic what a minimal implementation of a validation interface could look like using the web components.

<div>
  <div id="validation-grid"></div>

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
      createValidationGrid(0)
    });
}

/**
 * @param {Number} page
 */
function createValidationGrid(page) {
  const validationGridElement = document.getElementById("validation-grid");

  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const pageItems = gridItems.slice(startIndex, endIndex);

  for (const item of pageItems) {
    const spectrogramElement = Spectrogram(item);
    validationGridElement.appendChild(spectrogramElement);
  }
}

nextPage = () => {
  const validationGridElement = document.getElementById("validation-grid");
  validationGridElement.replaceChildren();

  createValidationGrid(++page);
}

/**
 * @param {typeof GridItem} model
 * @returns {HTMLElement}
 */
function Spectrogram(item) {
  const element = document.createElement("oe-spectrogram");
  element.className = "validation-grid-item";
  element.setAttribute("src", item.AudioLink);

  return element;
}

window.addEventListener("load", () => initGridItems());
})();
</script>

<style>
.validation-grid {
  display: flex;
  flex-wrap: wrap;
}

.validation-grid-item {
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
