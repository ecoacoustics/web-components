const relative = require("./relative-path.cjs");

module.exports = function ({ page }) {
  return `
<nav>
  <a href="${relative(page.url, "/")}">Install</a>
  <a href="${relative(page.url, "/examples/")}">Examples</a>
  <a href="${relative(page.url, "/api/")}">API</a>
</nav>`;
};
