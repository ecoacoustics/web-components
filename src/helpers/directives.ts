export function* loop<T>(
  items: T[] | undefined,
  f: (value: T, options: { index: number, first: boolean, last: boolean, odd: boolean, even: boolean }) => unknown,
) {
  if (items !== undefined) {
    let i = 0;

    for (const value of items) {
      const first = i == 0;
      const last = i == items.length - 1;
      const even = i % 2 == 0;
      const odd = !even;

      yield f(value, { index: i++, first, last, even, odd });
    }
  }
}
