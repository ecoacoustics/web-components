import { LitElement } from "lit";

export interface QueryDeeplyAssignedElementsOptions {
  selector: string;
  slot?: string;
}

/**
 * @example
 * ```ts
 * @queryDeeplyAssignedElements("#element-id", "slot-name")
 * public element: HTMLElement;
 * ```
 */
export function queryDeeplyAssignedElements(options: QueryDeeplyAssignedElementsOptions) {
  return (target: any, propertyKey: string) => {
    const descriptor = {
      get(this: LitElement) {
        const slotSelector = `slot${options.slot ?? ""}`;
        const slotElements = this.renderRoot?.querySelectorAll<HTMLSlotElement>(slotSelector);

        for (const slot of slotElements) {
          const assignedElements = slot.assignedElements();

          // because doing a query selector on a the slot element queries the
          // slot elements children, not the assigned elements
          // have to use a for loop over all the assigned elements
          // rather than directly querying the slot element itself
          for (const assignedElement of assignedElements) {
            if (assignedElement.matches(options.selector)) {
              return assignedElement;
            }

            const queriedElement = assignedElement.querySelector(options.selector);
            if (queriedElement !== null) {
              return queriedElement;
            }
          }
        }

        return null;
      },
    };

    Object.defineProperty(target, propertyKey, descriptor);
  };
}
