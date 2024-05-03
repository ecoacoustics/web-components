import header from "./header.11ty.js";
import nav from "./nav.11ty.js";
import relative from "./relative-path.js";

export default function (data) {
  const { title, page, content } = data;
  return `
<!doctype html>

<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${relative(page.url, "/docs.css")}">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600|Roboto+Mono">
    <link href="${relative(page.url, "/prism-okaidia.css")}" rel="stylesheet" />
    <script type="module" src="${relative(page.url, "./js/components.js")}"></script>
  </head>
  <body>
    ${header()}
    ${nav(data)}
    <div id="main-wrapper">
      <main>
        ${content}
      </main>
    </div>
  </body>
</html>`;
}
