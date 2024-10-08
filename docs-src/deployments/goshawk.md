---
layout: layouts/deployment.11ty.js
title: Goshawk Verification - Open Ecoacoustics
---

<oe-verification-grid id="verification-grid">
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <oe-verification verified="false" shortcut="N"></oe-verification>
    <oe-data-source slot="data-source" for="verification-grid"></oe-data-source>
</oe-verification-grid>

<section>
  <div>
    <form onsubmit="updateAuthToken(event)">
      <label>
        Authentication Token
        <input size="40">
      </label>
      <div>
        <button>Update Auth Token</button>
      </div>
    </form>
  </div>

  <p>
    <strong>Warning: Updating your auth token will reset your progress</strong>
  </p>

  <p>
    You can find your authentication token in the bottom left of
    <a href="https://www.ecosounds.org/my_account">this</a> page.
  </p>
</section>

<script>
let authToken = "";

function updateAuthToken(event) {
  event.preventDefault();
  authToken = event.target[0].value;
  setup();
}

function createCallback(filters) {
  const endpoint = "https://api.staging.ecosounds.org/audio_events/filter";

  return async ({ page } = { page: 1 }) => {
    const requestBody = {
      filters,
      paging: { page },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const responseData = (await response.json()).data;

    // add an "audioLink" key so that the verification grid knows where to fetch
    // the audio from
    responseData.forEach((model) => {
      const basePath = `https://api.staging.ecosounds.org/audio_recordings/${model.audio_recording_id}/media.flac`;
      const urlParams =
        `?audio_event_id=${model.id}` +
        `&end_offset=${model.end_time_seconds}&start_offset=${model.start_time_seconds}` +
        `&user_token=${authToken}`;
      const audioLink = basePath + urlParams;

      model.audioLink = audioLink;
    });

    console.debug(responseData);

    const result = {
      subjects: responseData,
      page: page + 1,
    };

    return result;
  };
}

function setup() {
  const verificationGridElement = document.getElementById("verification-grid");
  verificationGridElement.getPage = createCallback();
}

window.addEventListener("load", () => setup());
</script>
