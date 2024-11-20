---
layout: layouts/deployment.11ty.js
title: Cane Toads Verification
---

<oe-verification-grid id="verification-grid">
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <oe-verification verified="false" shortcut="N"></oe-verification>
    <oe-data-source id="data-source" slot="data-source" for="verification-grid" local></oe-data-source>
</oe-verification-grid>

<script>
const helpMessage = `
Please input your Ecosounds 'Authentication Token'.
You can find your authentication token at the bottom left corner of ecosounds.org/my_account

1. Go to ecosounds.org
2. Click on "Log In" in the menu bar
3. Log into your account using your email and password
4. Click on your username in the top-right of the menu bar
5. In the bottom left of your profile, you should see a card called 'Authentication Token'. Press the eye icon, then copy the text
6. Paste the text into this prompt and press 'Ok'
`;
let madeDecision = false;

function createUrlTransformer(authToken) {
    return (url, subject) => {
      // sometimes this dataset will have a url field, sometimes it will not
      // if it does we want to use the "url" column, if not, then we can
      // automatically derive it from the other columns
      const derivedUrl = !!url ? url : deriveUrlFromSubject(subject)
      return `${derivedUrl}&user_token=${authToken}`;
    }
}

function deriveUrlFromSubject(subject) {
  const apiRoot = "https://api.ecosounds.org";

  const audioRecordingId = subject.RecordingID;
  const startOffset = subject.Start;
  const endOffset = subject.End;

  return `${apiRoot}/audio_recordings/${audioRecordingId}/media.flac` +
         `?start_offset=${startOffset}&end_offset=${endOffset}`;
}

function setup() {
    const verificationGrid = document.getElementById("verification-grid");
    const dataSource = document.getElementById("data-source");
    let authToken = undefined;

    verificationGrid.addEventListener("decision", () => {
        madeDecision = true;
    });

    // if the user doesn't put in an authentication token or presses cancel
    // we want to keep showing them the auth token prompt
    do {
        authToken = prompt(helpMessage);
    } while (!authToken)

    // we use a url transformer to add the user_token parameter to all the
    // subject urls
    // this authentication token will NOT be added to the results output
    verificationGrid.urlTransformer = createUrlTransformer(authToken);
}

window.addEventListener("load", () => {
    setup();
});

window.addEventListener("beforeunload", (e) => {
    if (madeDecision) {
        e.preventDefault();
        e.returnValue = "";
    }
});
</script>
