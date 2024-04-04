# reactivity

## When to use `@property` decorator

- When you want an element to be exposed or reflected back to the DOM
- If you want this state variable to be a two-way data binding, you use use an associated event dispatcher

## When to use the `@state` decorator

- When you want low-frequency reactive state inside a LitElement

## When to use `signal()`'s

- When you want high-frequency two-way reactive state between components
