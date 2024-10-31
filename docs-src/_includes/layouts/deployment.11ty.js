export default function render({ content, title }) {
  return `
<!doctype html>

<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script type="module" src="/dist/components.js"></script>
  </head>
  <body>
    <div id="main-wrapper">
      <main>
        ${content}
      </main>
    </div>
  </body>
</html>`;
}
