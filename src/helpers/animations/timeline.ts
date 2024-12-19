type KeyframeClass = string;

export function createTimeline<T extends HTMLElement | SVGElement>(host?: T, keyframes = 1): void {
  console.debug(host);
  if (!host) {
    return;
  }

  let index = 0;

  host.addEventListener("animationend", () => {
    host.classList.remove(createKeyframeClass(index));

    index += 1;
    if (index < keyframes) {
      host.classList.add(createKeyframeClass(index));
    }
  });

  // apply the first keyframe
  host.classList.add(createKeyframeClass(index));
}

function createKeyframeClass(index: number): KeyframeClass {
  return `keyframe-${index}`;
}
