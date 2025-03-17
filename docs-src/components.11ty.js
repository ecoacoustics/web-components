import fs from "fs";

// I use trim to remove the leading and trailing whitespace from the string.
// This makes the code block easier to read because indentation is consistent.
const cssPartsExample = `
oe-axes *::part(grid-lines),
oe-axes::part(grid-lines) {
  color: red;
}
`.trim();

/**
 * This page generates its content from the custom-element.json file as read by
 * the _data/api.11tydata.js script.
 */
export default class Docs {
  data() {
    return {
      layout: "page.11ty.js",
      title: "Open Ecoacoustics - Components",
    };
  }

  render() {
    const manifest = JSON.parse(fs.readFileSync("custom-elements.json"));
    const elements = manifest.modules.reduce(
      (els, module) => els.concat(module.declarations?.filter((dec) => dec.customElement) ?? []),
      [],
    );

    return `
      <script src="/deps/prism-core.min.js"></script>
      <script src="/deps/prism-markup.min.js"></script>
      <script src="/deps/prism-autoloader.min.js"></script>

       <h1>API</h1>

       <section class="alert alert-warning mt-2">
        <h2 class="mt-0">Note about CSS parts</h2>
        <p>
          When targeting an annotate, indicator, or axes components css parts,
          you must target the component that is being wrapped.
        </p>

        <p>
          For example, if you want to change the colour of the axes components
          grid lines (<code>::part(grid-lines)</code>), you must use the
          following format:
        </p>

<pre class="language-css">
${Prism.highlight(cssPartsExample, Prism.languages.css)}
</pre>

       </section>
       ${elements
         .map(
           (element) => `
         <h2>&lt;${element.tagName}></h2>
         <div>
           ${element.description}
         </div>
         ${renderTable("Attributes", ["name", "description", "type.text", "default"], element.attributes)}
         ${renderTable(
           "Properties",
           ["name", "attribute", "description", "type.text", "default"],
           element.members.filter((m) => m.kind === "field"),
         )}
         ${renderTable(
           "Methods",
           ["name", "parameters", "description", "return.type.text"],
           element.members
             .filter((m) => m.kind === "method" && m.privacy !== "private")
             .map((m) => ({
               ...m,
               parameters: renderTable("", ["name", "description", "type.text"], m.parameters),
             })),
         )}
         ${renderTable(
           "Events",
           ["name", "description", "type.text"],
           element.events?.filter((e) => e.name !== undefined),
         )}
         ${renderTable("Slots", [["name", "(default)"], "description"], element.slots)}
         ${renderTable("CSS Shadow Parts", ["name", "description"], element.cssParts)}
         ${renderTable("CSS Custom Properties", ["name", "description"], element.cssProperties)}
         `,
         )
         .join("")}
     `;
  }
}

/**
 * Reads a (possibly deep) path off of an object.
 */
const get = (obj, path) => {
  let fallback = "";
  if (Array.isArray(path)) {
    [path, fallback] = path;
  }
  const parts = path.split(".");
  while (obj && parts.length) {
    obj = obj[parts.shift()];
  }
  return obj == null || obj === "" ? fallback : obj;
};

/**
 * Renders a table of data, plucking the given properties from each item in
 * `data`.
 */
const renderTable = (name, properties, data) => {
  if (data === undefined || data.length === 0) {
    return "";
  }
  return `
     ${name ? `<h3>${name}</h3>` : ""}
     <table class="table">
       <thead class="thead-dark">
         <tr scope="row">
           ${properties.map((p) => `<th>${capitalize((Array.isArray(p) ? p[0] : p).split(".")[0])}</th>`).join("")}
         </tr>
       </thead>
       <tbody>
         ${data.map((i) => `<tr scope="row">${properties.map((p) => `<td>${get(i, p)}</td>`).join("")}</tr>`).join("")}
       </tbody>
     </table>
   `;
};

const capitalize = (s) => s[0].toUpperCase() + s.substring(1);
