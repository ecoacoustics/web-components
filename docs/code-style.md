# Code Style

## Formatting

All code style should be in-line with the style-guide outlined in the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
unless explicitly stated otherwise inside this document.
All code formatting should be done through Prettier using the settings
defined in the [.editorconfig](/.editorconfig), [.prettierrc](/.prettierrc),
and [code-workspace](/webcomponents.code-workspace).

1. Use `lf` as the end of line terminator
2. Use utf-8 encoding
3. Use four spaces of indent
4. All files should end in a new line to be POSIX compliant
5. All quotations should use double quotation marks

## Lit attributes and properties

1. Should follow the order
   1. Context properties
   2. Reflected attributes
   3. Callback attributes
   4. Value attributes
   5. Boolean attributes
   6. Properties (e.g. `@property({ attribute: false })`)
      1. there is a difference between `@state` and
         `@property({ attribute: false })` see more here:
         <https://stackoverflow.com/a/70343809>
   7. Internal state (e.g. `@state()`)
   8. Deep query decorators
   9. Shallow query decorators
   10. Getters and setters (should always be public or protected)
   11. Event handlers (should always be private)
   12. Signal based reactive state (can be public)
   13. Non-reactive state (should always be private)
2. Inside the order above, they can be ordered within themselves in the
   following order
   1. Attributes (with default value)
   2. Attributes (that are required)
   3. Array attributes (that can't be undefined or null)
   4. Non-array attributes (that can't be undefined or null)
   5. Array attributes (that can be undefined or null)
   6. Non-Array Attributes (that can be undefined or null)
   7. Aliased attributes
   8. Non-aliased attributes
3. All state that is expected to change outside of the component should have
   the `@property()` decorator. If you do not wish it to be an attribute,
   use `@property({ attribute: false })`
4. All `@state` decorators should have the private or protected access modifiers
5. All query selectors (e.g. `@query()`, `@queryAll()`, etc...) should be
   private or protected. If the need to be exposed, consider using `[part]`s,
   `[slot]`s, or creating a memoized property to expose the ElementNode
6. Prefer to use internal state
7. All methods on a web component that returns a HTML, or SVG template must be
   prepended with "Template"(e.g. `private decisionPromptTemplate(): TemplateResult<1>`)
