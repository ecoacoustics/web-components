export type AnimationIdentifier = () => symbol;

const animationQueue = new WeakMap<WeakKey, FrameRequestCallback>();

// Because Firefox does not support Symbols as WeakMap keys, this function can
// be used to create a unique WeakMap key for each animation frame callback.
export function newAnimationIdentifier(description?: string): AnimationIdentifier {
  return () => Symbol(description);
}

export function runOnceOnNextAnimationFrame(key: WeakKey, callback: FrameRequestCallback) {
  const hasExistingTask = animationQueue.has(key);

  animationQueue.set(key, callback);

  if (hasExistingTask) {
    // if we already have a callback for this key,
    // we don't need to do anything
    return;
  }

  requestAnimationFrame((...args) => {
    const actualCallback = animationQueue.get(key);
    animationQueue.delete(key);

    if (!actualCallback) {
      // if the callback was deleted while we were waiting,
      // we don't need to do anything
      return;
    }

    callback(...args);
  });
}
