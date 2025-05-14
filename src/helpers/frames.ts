const animationQueue = new WeakMap<WeakKey, FrameRequestCallback>();

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
