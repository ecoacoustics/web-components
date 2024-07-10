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

        <details>
          <summary>
            Results
          </summary>

          <output id="decision-output">
          </output>
        </details>

        <style>
          main {
            max-width: 100%;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .grid-title {
            text-align: center;
          }

          #decision-output {
            position: relative;
            width: 100%;
          }

          .decision {
            display: block;
            color: var(--bs-light);
            background-color: var(--bs-dark);
            font-family: var(--bs-font-monospace);
            padding: 1.5em;
            border-radius: 0.5em;
          }
        </style>

        <script>
          (() => {
          const verificationGrid = document.getElementById("verification-grid");
          const outputElement = document.getElementById("decision-output");

          function outputDecision(x) {
            const element = document.createElement("pre");
            element.innerText = JSON.stringify(x.detail, null, 2);
            element.className = "decision";
            outputElement.appendChild(element);
          }

          verificationGrid.addEventListener("decision-made", (x) => outputDecision(x));
          })();
        </script>
      </div>
    </section>
  `;
};
