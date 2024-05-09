import page from "./page.11ty.js";
import relative from "./relative-path.js";

export default function (data) {
  return page({
    ...data,
    content: renderExample(data),
  });
}

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
