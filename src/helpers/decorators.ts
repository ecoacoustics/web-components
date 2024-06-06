import { LitElement } from "lit";

export interface QueryDeeplyAssignedElementsOptions {
  selector: string;
  slot?: string;
}

/**
 * @example
 * ```ts
 * @queryDeeplyAssignedElements("#element-id", "slot-name")
 * public element: Element;
 * ```
 */
export function queryDeeplyAssignedElement<T extends Element = Element>(options: QueryDeeplyAssignedElementsOptions) {
  // TODO: see if we can abstract away common functionality of these decorators
  return (target: unknown, propertyKey: string) => {
    const descriptor = {
      get(this: LitElement): T | null {
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
              // TODO: remove this type casting
              return assignedElement as T;
            }

            const queriedElement = assignedElement.querySelector<T>(options.selector);
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

// TODO: should probably return NodeListOf<Element> instead of Element[] to keep
// consistent with Lit @queryAll and querySelectorAll
/**
 * @example
 * ```ts
 * @queryDeeplyAssignedElements(".element-id", "slot-name")
 * public elements: Element[];
 * ```
 */
export function queryAllDeeplyAssignedElements(options: QueryDeeplyAssignedElementsOptions) {
  return (target: unknown, propertyKey: string) => {
    const descriptor = {
      get(this: LitElement) {
        const slotSelector = `slot${options.slot ?? ""}`;
        const slotElements = this.renderRoot?.querySelectorAll<HTMLSlotElement>(slotSelector);
        const returnedElements: Element[] = [];

        for (const slot of slotElements) {
          const assignedElements = slot.assignedElements();

          for (const assignedElement of assignedElements) {
            if (assignedElement.matches(options.selector)) {
              returnedElements.push(assignedElement);
            }

            const queriedElements = assignedElement.querySelectorAll(options.selector);
            if (queriedElements.length > 0) {
              returnedElements.push(...queriedElements);
            }
          }
        }

        if (returnedElements.length > 0) {
          return returnedElements;
        }

        return null;
      },
    };

    Object.defineProperty(target, propertyKey, descriptor);
  };
}
