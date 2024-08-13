---
layout: layouts/default.11ty.js
title: Open Ecoacoustics | Examples | Verification Interface (fake)
---

## How to Create a Verification Grid

To use a verification grid, you will have to create a simple website.

To help, we have provided a template below that you can copy and modify.
Along with additional information on how to customize it to your needs.

```html
<!-- index.html -->
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OE Bat Verification Grid</title>
    <script type="module" src="https://esm.run/@ecoacoustics/web-components"></script>
  </head>

  <body>
    <oe-verification-grid id="verification-grid" grid-size="3" selection-behavior="desktop">
      <oe-verification verified="true" shortcut="Y">Grey-headed flying fox</oe-verification>
      <oe-verification verified="false" shortcut="N">Grey-headed flying fox</oe-verification>
    </oe-verification-grid>

    <oe-data-source for="verification-grid" local></oe-data-source>
  </body>
</html>
```

### Breakdown and Explanation

Most of the code that you see in the template above is boilerplate, and in most
circumstances, you should not need to modify it.

Some important code snippets that you can modify above:

#### Changing the Title Shown in the Browser Tab

You can change the text shown in the browser tab by modifying the `<title></title>`
elements content.

For example: If you want to change the title of your verification component from
_OE Bat Verification Grid_ to _Koala Verification Grid_, you would change the
text in between the `<title>` code to the following.

```html
<title>Koala Verification Grid</title>
```

#### Changing the Decisions

Decisions can be applied to all grid tiles, or subset through sub-selection.
Each decision element will display as a button that the user can click and will
add an `oe-verified`, `oe-tag`, and `oe-additional` tags to each grid tile that
was selected.

It is possible to change the decisions by adding and deleting the `oe-decision`
code from above.
You can verify if a tag is correct by using the `verified` and `tag` attributes.

All decisions _should_ have an associated keyboard shortcut.
This can be configured through the `shortcut` attribute.
For example: By changing the `shortcut` attribute to `Y` (`shortcut="Y"`), when
the <kbd>Y</kbd> key is clicked on the keyboard, the associated decision will be
clicked.

There is a attribute named `additional-tags` which will create an
`oe-additional-tags` column when exported.
This differs from the `tag` attribute, because while the `tag` and `verified`
attribute confirms or denies the existence of an audio event and not creating
any new tags, `additional-tags` creates additional information/tags to an audio
event that did not previously exist.

### How to Publish Your Verification Grid

So that other people can use your verification grid, you will need to publish the
code you wrote above to the public internet.

_Note: By publishing your website, any person (or machine) who has access to the
internet will be able to access your website._

Netlify is a website that publishes your websites to the internet and allows other
people to use your website (such as the verification grid created before).

### Creating a Netlify Site

You first have to create a Netlify site by going to the following url:
[app.netlify.com](https://app.netlify.com/).

If you forget to log in, spectrograms will fail to render with the error
`Error: SharedArrayBuffer is not defined.`, and the website that you create
will only be available for one hour.

---

Create your website by creating a new directory with the name of you website
e.g. "Koala Verification Grid"
Add the `index.html` file created above with the following `netlify.toml` file
to this new directory.

By adding the following `netlify.toml`, you allow the website to run high
performance code such as `SharedArrayBuffer`.
Without the following config file, you will get the error
`Error: SharedArrayBuffer is not defined.`

```toml
# netlify.toml
[[headers]]
  for = "/*"
    [headers.values]
    Access-Control-Allow-Origin = "*"
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

You should now have a folder with the following contents:

```txt
Koala Verification Grid/
  - index.html
  - netlify.toml
```

#### Deploying Your Verification Grid

**Warning!**
It is important to note that by deploying your website, any person on the
internet will be able to access it and any data associated with it.
Attackers regularly search the entire internet for websites, so security through
obscurity is not a plausible defense against your data being leaked if you
upload it.

---

To deploy your website go to
[app.netlify.com/drop](https://app.netlify.com/drop)
and drag and drop the folder/directory that contains your `index.html` and
`netlify.toml` file.

You have now deployed your verification grid.
After deployment, netlify will provide you with a link that you can send to
anyone that has access to the internet.
