# Ecoacoustics Web Components

## Component Deployments

- Documentation: [oe-web-components.netlify.app](https://oe-web-components.netlify.app)
- NPM: [npmjs.com/package/@ecoacoustics/web-components](https://www.npmjs.com/package/@ecoacoustics/web-components)
- CDN: [jsdelivr.com/package/npm/@ecoacoustics/web-components](https://www.jsdelivr.com/package/npm/@ecoacoustics/web-components)
- GitHub Releases: [github.com/ecoacoustics/web-components/releases](https://github.com/ecoacoustics/web-components/releases)

## How to Use

### CDN

You can import all the web components through the CDN

Script tag snippet:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ecoacoustics/web-components/dist/components.js"></script>
```

Full page example:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web Component CDN Example</title>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@ecoacoustics/web-components/dist/components.js"></script>
  </head>

  <body>
    <oe-axes>
      <oe-indicator>
        <oe-spectrogram
          id="playing-spectrogram"
          class="large"
          src="/example.flac"
          window-size="1024"
          scaling="stretch"
        ></oe-spectrogram>
      </oe-indicator>
    </oe-axes>
    <oe-media-controls for="playing-spectrogram"></oe-media-controls>
  </body>
</html>
```

### NPM

You can add the example components used in this repository by using the following command

```sh
$ npm i @ecoacoustics/web-components
>
```

You can then import them into a file using

```js
import * from "@ecoacoustics/web-components";
```

## Contributing

- Install a recent stable version of Node JS
- Install pnpm: `corepack enable pnpm`, followed by `corepack use pnpm@latest`
- The install dependencies: `pnpm install` (this should have happened with the last step)

Then you can run the following commands:

- `pnpm dev` to start a development server
- `pnpm build` to build the components
- `pnpm test` to run the tests

### Test performance and retries

Verification-grid tests are grouped by behavior in `src/tests/verification-grid/`.
Keep their suite titles stable: screenshot names are derived from those titles.
Files run independently across workers and CI shards; tests within a file remain sequential.

Fixture readiness waits for element visibility, Lit updates, and sourced spectrograms'
render workers to finish, rather than network idleness. Render readiness is checked
every 500 ms with an eight-second timeout. Screenshot assertions can also retry
for up to eight seconds instead of sleeping unconditionally.

Tests do not retry inline. In CI, each shard finishes its first pass before rerunning
only its failed tests once with `--last-failed --workers=1 --retries=0 --trace=on`.
Infrastructure/global errors are not retried. Locally, the same command can rerun
failures from the last invocation (add the same `--project` used for that invocation).
The Firefox page/context teardown workaround runs only when a test requests a page.

CI retains separate `merged-test-report` (first pass) and `merged-retry-report`
(if needed) artifacts. A recovered failure remains a failure in the first-pass
report and a pass in the retry report, rather than being labeled as a native
Playwright flaky result. The shard succeeds only if its first pass or its retry
passes. Retry traces are retained in the retry report. Browser installation and
caching share an explicit `PLAYWRIGHT_BROWSERS_PATH` on every runner OS.

### GitHub Releases

You can manually import the example components in this repository using the [GitHub releases page](https://github.com/ecoacoustics/web-components/releases)

Download the `component.js` file to use all web components or import a subset of components through the `components.zip` zip archive.

## Supported Browsers

|         | Chrome | Firefox | Safari |
| ------- | ------ | ------- | ------ |
| Windows | ✅     | ✅      | ❌     |
| MacOS   | ✅     | ✅      | ✅     |
| Linux   | ✅     | ✅      | ❌     |
