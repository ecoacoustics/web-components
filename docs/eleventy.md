# Eleventy

There is currently a bug with our eleventy docs where the asset passthrough isn't
re-evaluated with the `eleventy --watch --incremental` flags.

This means that if you build you components, and start the dev server, files will
be updated if they change, but new files will not be reflected in the eleventy build.
