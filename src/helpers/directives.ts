import { html, TemplateResult } from "lit";

type TimesReturn = (iteration: number) => TemplateResult;

/**
 * A generator function that iterates over an array and yields the result of applying a callback function to each item
 * with additional metadata about the iteration.
 *
 * @param items - The array to iterate over
 *
 * @param f - The callback function to apply to each item
 * @param f.value - The current item being processed
 * @param f.options - Additional information about the current iteration
 * @param f.options.index - The index of the current item
 * @param f.options.first - Whether the current item is the first in the array
 * @param f.options.last - Whether the current item is the last in the array
 * @param f.options.odd - Whether the current index is odd
 * @param f.options.even - Whether the current index is even
 *
 * @example
 * ```ts
 * render() {
 *   return html`
 *     <ul>
 *       ${loop(
 *         this.items,
 *         (item, { odd }) => html`<li class="${odd ? 'odd' : 'even'}">${item}</li>`,
 *       )}
 *     </ul>
 *   `;
 * }
 * ```
 */
export function* loop<T>(
  items: T[] | undefined,
  f: (
    value: T,
    options: {
      index: number;
      first: boolean;
      last: boolean;
      odd: boolean;
      even: boolean;
    },
  ) => unknown,
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

/**
 * @description
 * Repeats a template a certain number of times
 */
export function repeatCount(repetitions: number, template: TimesReturn): TemplateResult {
  return html`${Array.from({ length: repetitions }).map((_, i: number) => template(i))}`;
}
