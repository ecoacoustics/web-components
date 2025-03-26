---
layout: page.11ty.js
title: Ecoacoustics Web Components
---

## Install

### CDN

All JavaScript files are automatically deployed [jsdelivr](https://www.jsdelivr.com/package/npm/@ecoacoustics/web-components)

To use the CDN, simply add the following code into the `<head>` tag of your website

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ecoacoustics/web-components/dist/components.js"></script>
```

### Install via NPM

```sh
$ npm i @ecoacoustics/web-components
>
```

### Manually Install JS Files

You can find all releases on [github](https://github.com/ecoacoustics/web-components/releases)

### Important Notes

If you are self-hosting the web components through NPM, GitHub releases, or copying
the source code, you will have to enable the following headers on your web sever

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## How to Create a Verification Grid

Follow the steps in [here](/examples/create-verification-grid/index.html) to create a verification grid.
