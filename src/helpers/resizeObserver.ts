export class OeResizeObserver {
  private constructor() {}

  // we use a weakmap so that hopefully when the element references are destroyed the callbacks will be too
  private static callbacks: WeakMap<HTMLElement, () => void> = new WeakMap();
  private static _instance: ResizeObserver;

  public static get instance() {
    if (!this._instance) {
      this._instance = new ResizeObserver((targets: any[]) => {
        for (const target of targets) {
          this.callbacks.get(target.target)?.();
        }
      });
    }

    return this._instance;
  }

  public static observe(element: HTMLElement, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.instance.observe(element);
  }

  public static unobserve(element: HTMLElement): void {
    this.instance.unobserve(element);
    this.callbacks.delete(element);
  }
}
