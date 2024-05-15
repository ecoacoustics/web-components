---
layout: example.11ty.js
title: Open Ecoacoustics | Examples | A2O Search
---

## A2O Search Grid

This example tries to mimic A2O search [search.acousticobservatory.org/search/](https://search.acousticobservatory.org/search/?q=https%3A%2F%2Fapi.search.acousticobservatory.org%2Fapi%2Fv1%2Fa2o%2Faudio_recordings%2Fdownload%2Fflac%2F256800%3Fstart_offset%3D4035%26end_offset%3D4040).

<section>
  <oe-axes class="main-spectrogram">
    <oe-indicator class="main-spectrogram">
      <oe-spectrogram
        id="main-spectrogram"
        class="main-spectrogram"
        src="https://api.search.acousticobservatory.org/api/v1/a2o/audio_recordings/download/flac/256800?start_offset=4035&end_offset=4040"
        window-size="128"
      ></oe-spectrogram>
    </oe-indicator>
  </oe-axes>
  <oe-media-controls for="main-spectrogram"></oe-media-controls>

  <hr />

  <div id="search-grid-container" class="grid-container"></div>
</section>

<script>
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

const itemsPerPage = 24;
let page = 0;

/**
 * @param {String} dateString
 * @returns {String}
 */
function formatDateString(dateString) {
  const dateObject = new Date(dateString);

  return dateObject.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC'
  });
}

/**
 * @param {typeof GridItem} item
 * @returns {String}
 */
function listenUrl(item) {
  const startOffset = item.Offset;
  const endOffset = item.Offset + 30;

  return `https://data.acousticobservatory.org/listen/${item.FileId}?start=${startOffset}&end=${endOffset}`;
}

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
      createGrid()
    });
}

function createGrid() {
  const gridContainer = document.getElementById("search-grid-container");

  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const pageItems = gridItems.slice(startIndex, endIndex);

  for (const i in pageItems) {
    gridContainer.appendChild(GridCard(i, pageItems[i]));
  }
}

/**
 * @param {Number} id
 * @param {typeof GridItem} item
 * @returns {HTMLElement}
 */
function Spectrogram(id, item) {
  const element = document.createElement("oe-spectrogram");
  element.setAttribute("id", id);
  element.setAttribute("src", item.AudioLink);
  element.className = "search-card-spectrogram";

  return element;
}

/**
 * @param {Number} id
 * @returns {HTMLElement}
 */
function MediaControls(id) {
  const element = document.createElement("oe-media-controls");
  element.setAttribute("for", id);
  element.className = "search-card-controls";

  return element;
}

/**
 * @param {typeof GridItem} item
 * @returns {HTMLElement}
 */
function AudioDetails(item) {
  const element = document.createElement("div");
  element.className = "search-card-details";

  element.innerHTML = `
    <section>
      <div class="details-text">
        <span class="details-title">Site:</span> <span>${item.Subsite}</span>
      </div>

      <div class="details-text">
        <span class="details-title">Recorded:</span> <span>${formatDateString(item.Datetime)}</span>
      </div>

      <div class="details-text">
        <span class="details-title">Result:</span> <span>${formatDateString(item.Datetime)}</span>
      </div>
    </section>

    <section class="details-links">
      <a href="${listenUrl(item)}" style="float: left;">Full Recording</a>
      <a href="#noop" style="float: right;">Use in new search</a>
    </section>
  `;

  return element;
}

/**
 * @param {Number} id
 * @param {typeof GridItem} item
 * @returns {HTMLElement}
 */
function GridCard(id, item) {
  const uniqueId = `search-grid-${id}`;

  const cardElement = document.createElement("div");
  cardElement.className = "search-grid-card";

  const spectrogramElement = Spectrogram(uniqueId, item);
  const detailsElement = AudioDetails(item);
  const mediaControlsElement = MediaControls(uniqueId);

  cardElement.appendChild(spectrogramElement);
  cardElement.appendChild(detailsElement);
  cardElement.appendChild(mediaControlsElement);

  return cardElement;
}

window.addEventListener("load", () => initGridItems());
})();
</script>

<style>
:root {
  --primary-color: #037447;
}

hr {
  border: 2px solid var(--primary-color);
  opacity: 1;
}

oe-spectrogram {
    position: relative;
    width: 300px;
    height: 100px;
}

.main-spectrogram {
  position: relative;
  width: 1200px;
  height: 200px;
}

.grid-container {
  display: flex;
  flex-wrap: wrap;

  > * {
    margin: 0.5rem;
    border-radius: 0.5rem;
  }
}

.search-grid-card {
  position: relative;
  border: solid 1px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-card-spectrogram {
  position: relative;
  width: 300px;
  height: 100px;
}

.search-card-details {
  padding: 1rem;

  .details-text {
    display: grid;
    grid-template-columns: 1fr 2fr;

    & > .details-title {
      font-weight: bold;
    }
  }

  .details-links {
    padding-top: 1rem;
    padding-bottom: 1.5rem;

    & a {
      color: var(--primary-color);
    }
  }
}

.search-card-controls {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border-radius: 9999em;
  border-color: var(--primary-color);
  padding: 0px;
  zoom: 0.75;
}
</style>
