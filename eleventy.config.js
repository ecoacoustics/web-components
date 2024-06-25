import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy("docs-src/docs.css");
  eleventyConfig.addPassthroughCopy("public/");
  eleventyConfig.addPassthroughCopy("components.js");
  eleventyConfig.addPassthroughCopy("assets/");

  eleventyConfig.addPassthroughCopy("node_modules/prismjs/themes/prism-okaidia.min.css");
  eleventyConfig.addPassthroughCopy("node_modules/prismjs/components/prism-core.min.js");
  eleventyConfig.addPassthroughCopy("node_modules/prismjs/components/prism-markup.min.js");
  eleventyConfig.addPassthroughCopy("node_modules/prismjs/plugins/autoloader/prism-autoloader.min.js");

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
