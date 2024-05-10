# Testing

## Worker resolution

Because workers use runtime module resolution through URLs, it is possible for workers to work within development environments, but completely break when sent to a CDN. This is because Vite sometimes assumes that you will always have all file paths in the same location as the server that is running. Unfortunately, this is not true for CDNs where the server that is running the code is not the same location that it is fetched.

Therefore, to ensure that your development environment is correct when manually testing compiled/bundled assets, I recommend doing the following:

1. Compile the components through `pnpm build:components`
2. Start the development server (<http://localhost:5173>)
3. A second Vite server **In a different directory** (<http://localhost:5174>)
4. Import the components from the first development server (<http://localhost:5173/components.js>)
5. Do your testing on the second Vite server (<http://localhost:5174>)

I recommend this when testing because:

- When testing, if the Vite compiled/bundled code tries to resolve through relative paths, the second Vite server will error, since it doesn't have the worker files locally
- You should see all your runtime imports resolved with the first dev servers host prepended to the remote URL
- The first development server therefore "mimics" a CDN or remote server with code, while the second Vite server mimics a consumer with no component code
