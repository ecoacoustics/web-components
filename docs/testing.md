# Testing

All disabled tests should have a comment explaining why a test is disabled with
a link to a GitHub issue tracking the disabled test.

```ts
// https://github.com/ecoacoustics/web-components/issues/86
test.skip("should not error", () => {});
```

## Test Sharding

CI tests are sharded into 4 parallel parts per OS platform to reduce execution time. The sharding is handled automatically by the CI workflow using Playwright's built-in sharding feature. When running tests locally, no sharding is applied and tests use the standard HTML reporter.

## Tests are not running

If you are getting the error "Test did not run." or "Could not find module xyz."
delete the `.cache` directory under [playwright/](../playwright).
