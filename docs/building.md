# Building

We use Vite to compile and bundle the components, and we use the TypeScript CLI (`tsc`) to generate type declaration files.

The TypeScript CLI should therefore never be used to build components as it can result in a messy build.

Vite will build to the `js/` directory, while the TypeScript CLI will build to the `@types` directory.

It is critical that the TypeScript CLI never interacts with Vite and the vice versa.

Eleventy will handle building its own docs. However, the Vite dev server can be used during development of the docs website.

Vite will assume that the location of the `outDir` is the same location that you are running a hypothetical dev server from. This means that if you compile your components for the **current** directory (`./`). When you import them, all relative paths will be relative to the **current** directory. If you start a dev server in `./dist/docs/`, all module imports (that weren't inlined, e.g. Workers, AudioWorklets, etc...) will break because Vite assumed that you were going to run your dev server with the relative paths at `./`.
