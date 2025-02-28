import { LitElement } from "lit";

export interface QueryDeeplyAssignedElementsOptions {
  selector: string;
  slot?: string;
}

export interface QueryParentElementsOptions {
  selector: string;
  root?: HTMLElement;
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
      get(this: LitElement): Readonly<T | null> {
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
export function queryAllDeeplyAssignedElements<T extends Element = Element>(
  options: QueryDeeplyAssignedElementsOptions,
) {
  return (target: unknown, propertyKey: string) => {
    const descriptor = {
      get(this: LitElement): Readonly<T[] | null> {
        const slotSelector = `slot${options.slot ?? ""}`;
        const slotElements = this.renderRoot?.querySelectorAll<HTMLSlotElement>(slotSelector);
        const returnedElements: T[] = [];

        for (const slot of slotElements) {
          const assignedElements = slot.assignedElements();

          for (const assignedElement of assignedElements) {
            if (assignedElement.matches(options.selector)) {
              returnedElements.push(assignedElement as T);
            }

            const queriedElements = assignedElement.querySelectorAll<T>(options.selector);
            if (queriedElements.length > 0) {
              returnedElements.push(...queriedElements);
            }
          }
        }

        if (returnedElements.length > 0) {
          return returnedElements;
        }

        return [];
      },
    };

    Object.defineProperty(target, propertyKey, descriptor);
  };
}

/**
 * @description
 * Recursively queries the parent element of the current element until it
 * reaches the selector that matches the query.
 * If no element is found, null will be returned.
 */
export function queryParentElement(options: QueryParentElementsOptions) {
  const recursiveParentElementSearch = (element: HTMLElement): any => {
    if (element.matches(options.selector)) {
      return element;
    } else if (element.parentElement) {
      // we check if we can navigate within the current DOM using parentElement
      // if we cannot, we can conclude that we have reached the end of the
      // current DOM's scope (e.g. we are at the root of a components shadow
      // DOM or we are at the top of the document)
      return recursiveParentElementSearch(element.parentElement);
    } else if ((element.getRootNode() as any)?.host) {
      // we use getRootNode().host so that if we are in the final node of
      // a components shadowDom, we we target the components selector.
      // this allows us to escape the shadow DOM
      return recursiveParentElementSearch((element.getRootNode() as any).host);
    }

    return null;
  };

  return (target: unknown, propertyKey: string) => {
    const descriptor = {
      get(this: LitElement) {
        const rootElement = options.root ?? this;
        return recursiveParentElementSearch(rootElement);
      },
    };

    Object.defineProperty(target, propertyKey, descriptor);
  };
}

// TODO: we probably want to use a reactive controller here instead of monkey patching the updated function
/**
 * @description
 * Makes a property/attribute required, and will throw an error if the property
 * is not set.
 *
 * @example
 * ```ts
 * @required()
 * @property({ type: String })
 * public name!: string;
 * ```
 *
 * @throws {Error} If the property is not set.
 */
export function required() {
  // in the "after" lifecycle hook, check if the property is set
  return (target: any, propertyKey: string) => {
    const originalUpdated = target.updated;

    target.updated = function (changedProperties: Map<string | number | symbol, unknown>) {
      if (this[propertyKey] === undefined) {
        throw new Error(`Property ${propertyKey} is required by ${target.constructor.name} but is not set.`);
      }

      originalUpdated?.call(this, changedProperties);
    };
  };
}
