import Logger from './logger';

export class MediaException extends Error {
  constructor(message) {
    super(message);
    this.name = 'MediaException';
  }
}

/**
 * Get the media element when the component loads or is updated
 */
export function getMedia(element: string, owner: globalThis.HTMLElement, logger: Logger): globalThis.HTMLMediaElement | null {
  const mediaSource = owner.querySelector(`#${element}`);

  // Warn if no element has been set
  if (!element) {
    logger.warn('No HTMLMediaElement was defined');

    // If the HTMLELement does not throw an error
  } else if (!mediaSource) {
    throw new MediaException(`The HTMLElement ${element} does not exist`);

    // If mediaSource HTMLElement is a HTMLMediaElement
  } else if (mediaSource instanceof globalThis.HTMLMediaElement || mediaSource.id === 'allow-unsafe') {
    // Cast from HTMLElement to HTMLMediaElement and return mediaSource
    return mediaSource as globalThis.HTMLMediaElement;

    // If the HTMLElement is not a HTMLMediaElement throw an error
  } else {
    throw new MediaException(`The HTMLElement ${element} is not a HTMLMediaElement`);
  }

  return null;
}
