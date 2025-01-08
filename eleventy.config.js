import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

export default function (config) {
  config.addPlugin(syntaxHighlight);
  config.addPassthroughCopy("docs-src/docs.css");
  config.addPassthroughCopy("public/");
  config.addPassthroughCopy("docs-src/public/");
  config.addPassthroughCopy("dist/");
  config.addPassthroughCopy("assets/");

  // we don't use the node_modules folder in the docs deployment because Netlify
  // will refuse to serve the node_modules/ directory through their web server
  // to get around this, we copy the necessary files from node_modules to a
  // deps/ directory
  config.addPassthroughCopy({ "node_modules/prismjs/themes/prism-okaidia.min.css": "deps/prism-okaidia.min.css" });
  config.addPassthroughCopy({ "node_modules/prismjs/components/prism-core.min.js": "deps/prism-core.min.js" });
  config.addPassthroughCopy({ "node_modules/prismjs/components/prism-markup.min.js": "deps/prism-markup.min.js" });
  config.addPassthroughCopy({
    "node_modules/prismjs/plugins/autoloader/prism-autoloader.min.js": "deps/prism-autoloader.min.js",
  });

  return {
    dir: {
      input: "docs-src",
      output: "dist/docs",
    },
    templateExtensionAliases: {
      "11ty.js": "11ty.js",
      "11tydata.js": "11tydata.js",
    },
  };
}
