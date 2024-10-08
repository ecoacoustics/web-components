---
layout: layouts/deployment.11ty.js
title: Goshawk Verification - Open Ecoacoustics
---

<oe-verification-grid id="verification-grid">
    <oe-verification verified="true" shortcut="Y"></oe-verification>
    <oe-verification verified="false" shortcut="N"></oe-verification>
    <oe-data-source id="data-source" slot="data-source" for="verification-grid"></oe-data-source>
</oe-verification-grid>

<script>
const helpMessage = `
Please input your Ecosounds 'Authentication Token'.
You can find your authentication token at the bottom left corner of ecosounds.org/my_account

1. Go to ecosounds.org
2. Click on "Log In"
3. Log into your account using your email and password
4. Click on your username in the top-right of the navbar
5. In the bottom left of your profile, you should see a card called 'Authentication Token'. Press the eye icon, then copy the text
6. Paste the text into this prompt and press 'Ok'
`;

function createUrlTransformer(authToken) {
    return (url) => `${url}&user_token=${authToken}`;
}

function setup() {
    const verificationGrid = document.getElementById("verification-grid");
    const dataSource = document.getElementById("data-source");
    let authToken = undefined;

    do {
        authToken = prompt(helpMessage);
    } while (!authToken)

    console.debug(verificationGrid);
    verificationGrid.urlTransformer = createUrlTransformer(authToken);

    // we set the datasource's src after the url transformer so that the
    // verification grid doesn't make hundreds of requests to the api that
    // will fail because of authentication errors
    dataSource.src = "/public/goshawk.csv";
}

setup();
</script>
