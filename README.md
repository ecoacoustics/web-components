  # Ecoacoustics Web Components

## Online deployment of example components

Using this workspace, the [`src/components`](/src/components/) directory has been automatically deployed to the following locations

- Documentation: [wc-workspace-demojtgf4zsprh.netlify.app](https://wc-workspace-demojtgf4zsprh.netlify.app)
- NPM: [npmjs.com/package/@ecoacoustics/web-components](https://www.npmjs.com/package/@ecoacoustics/web-components)
- CDN: [jsdelivr.com/package/npm/@ecoacoustics/web-components](https://www.jsdelivr.com/package/npm/@ecoacoustics/web-components)
- GitHub Releases: [github.com/QutEcoacoustics/ecoacoustics-web-components/releases](https://github.com/QutEcoacoustics/ecoacoustics-web-components/releases)

## How to use

### CDN

You can import web components through the CDN

Script tag snippet:

```html
<script type="module" src="https://esm.run/@ecoacoustics/web-components"></script>
```

Full page example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web Component CDN Example</title>
    <script type="module" src="https://esm.run/@ecoacoustics/web-components"></script>
  </head>

  <body>
    <my-todo-list></my-todo-list>
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

You can manually import the example components in this repository using the [GitHub releases page](https://github.com/QutEcoacoustics/ecoacoustics-web-components/releases)

Download the `component.js` file to use all web components or import a subset of components through the `components.zip` zip archive.
