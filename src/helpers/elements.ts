export function isInShadowRoot(element: Readonly<HTMLElement>): Readonly<boolean> {
  return element.getRootNode() instanceof ShadowRoot;
}
