const relative = require("./relative-path.cjs");

module.exports = function ({ page }) {
  return `
<nav>
  <a href="${relative(page.url, "/")}">Install</a>
  <a href="${relative(page.url, "/components/")}">Components</a>
  <a href="${relative(page.url, "/examples/")}">Examples</a>
</nav>`;
};
