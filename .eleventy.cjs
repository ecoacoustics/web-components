const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy("docs-src/docs.css");
  eleventyConfig.addPassthroughCopy("public/");

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
};
