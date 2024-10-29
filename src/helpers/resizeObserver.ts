// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OeResizeObserver {
  private constructor() {}

  // we use a weakmap so that hopefully when the element references are destroyed the callbacks will be too
  private static callbacks: WeakMap<Element, ResizeObserverCallback> = new WeakMap();
  private static _instance: ResizeObserver;

  public static get instance(): ResizeObserver {
    if (!this._instance) {
      this._instance = new ResizeObserver((targets: ResizeObserverEntry[]) => {
        for (const entry of targets) {
          // TODO: Fix the as any here
          this.callbacks.get(entry.target)?.(targets, this._instance);
        }
      });
    }

    return this._instance;
  }

  public static observe(element: HTMLElement, callback: ResizeObserverCallback): void {
    this.callbacks.set(element, callback);
    this.instance.observe(element);
  }

  public static unobserve(element: HTMLElement): void {
    // I have had to add this condition to prevent race conditions in component
    // destruction
    // e.g. If a component is added, and then destroyed before a full life cycle
    // has completed
    if (element instanceof Element) {
      this.instance.unobserve(element);
    } else {
      console.warn("Attempted to unobserve a non-element");
    }

    this.callbacks.delete(element);
  }
}
