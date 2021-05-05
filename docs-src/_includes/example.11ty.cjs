const page = require("./page.11ty.cjs");
const relative = require("./relative-path.cjs");

module.exports = function (data) {
  return page({
    ...data,
    content: renderExample(data),
  });
};

const renderExample = ({ name, content, collections, page }) => {
  return `
    <section class="examples">
      <nav class="collection">
        <ul>
          ${
            collections.example === undefined
              ? ""
              : collections.example
                  .map(
                    (post) => `
                  <li class=${post.url === page.url ? "selected" : ""}>
                    <a href="${relative(page.url, post.url)}">${post.data.description.replace(/</g, "&lt;")}</a>
                  </li>
                `,
                  )
                  .join("")
          }
        </ul>
      </nav>
      <div>
        ${content}
      </div>
    </section>
  `;
};
