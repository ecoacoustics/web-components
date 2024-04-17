# `tests/`

This directory should be used for end-to-end (e2e) tests

All unit tests should be co-located in the `src/components/` with the source code

## Unit tests

A unit test should mainly test:

- A single component
- Properties, methods, and other non-visual interactions (can be done through `evaluate`)
- Should be done with mount
- Do support injecting additional html through
- Should be in a file named _name.spec.ts_
- Should be located next to the component

## E2E tests

Should mainly test:

- The interaction of multiple components
- Interactions driven by "user" simulated events (`.click`, etc..)
- Should assert visual state, text content, and physical layout
- Every test should have a fixture. that fixture should
  - Define a template to render set by `.setContent`
  - Should have locators and other helpful methods cached
  - May contain methods to update the DOM
- Should be in a filed named `name.e2e.spec.ts`
- If the e2e test has a main component that it is testing, it should be co-located with the component
  - If the e2e test does not have a main subject, it should be located under the [`/tests`](/tests) directory

## Notes

If you want to use the components imported by `playwright/index.html` and `playwright/index.ts`, you will need to use the `sand4rt/experimental-ct-web` package.

This should be resolved when playwright add lit support to `ct-web`
