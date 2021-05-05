const path = require("path");

module.exports = (base, p) => {
  const relativePath = path.posix.relative(base, p);

  if (p.endsWith("/") && !relativePath.endsWith("/") && relativePath !== "") {
    return relativePath + "/";
  }

  return relativePath;
};
