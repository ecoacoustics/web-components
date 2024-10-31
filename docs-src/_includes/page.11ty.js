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
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-okaidia.min.css">
    <script type="module" src="/dist/components.js"></script>
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
