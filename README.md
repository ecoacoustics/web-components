# Ecoacoustics Web Components

**This is an unstable development branch**

To download the perch model, run the `download-assets.sh` script from the root
directory.

```sh
$ ./download-assets.sh
>
```

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

### GitHub Releases

You can manually import the example components in this repository using the [GitHub releases page](https://github.com/ecoacoustics/web-components/releases)

Download the `component.js` file to use all web components or import a subset of components through the `components.zip` zip archive.

## Supported Browsers

|         | Chrome | Firefox | Safari |
| ------- | ------ | ------- | ------ |
| Windows | ✅     | ✅      | ❌     |
| MacOS   | ✅     | ✅      | ✅     |
| Linux   | ✅     | ✅      | ❌     |
