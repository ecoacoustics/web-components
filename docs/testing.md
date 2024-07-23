# Testing

All disabled tests should have a comment explaining why a test is disabled with
a link to a GitHub issue tracking the disabled test.

```ts
// https://github.com/ecoacoustics/web-components/issues/86
test.skip("should not error", () => {});
```

## Tests are not running

If you are getting the error "Test did not run." or "Could not find module xyz."
delete the `.cache` directory under [playwright/](../playwright).
