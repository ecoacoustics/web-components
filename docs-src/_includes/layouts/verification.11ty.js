import example from "./default.11ty.js";

export default function (data) {
  return example({
    ...data,
    content: renderVerification(data),
  });
}

const renderVerification = ({ name, content, collections, page }) => {
  return `
    <section class="examples">
    <nav class="collection">
        <ul>
        ${
          collections.verification === undefined
            ? ""
            : collections.verification
                .map(
                  (post) => `
                <li class=${post.url === page.url ? "selected" : ""}>
                    <a href="${post.url}">${post.data.description.replace(/</g, "&lt;")}</a>
                </li>
                `,
                )
                .join("")
        }
        </ul>
      </nav>
      <div>
        ${content}

        <style>
          main {
            max-width: 100%;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .grid-title {
            text-align: center;
          }
        </style>
      </div>
    </section>
  `;
};
